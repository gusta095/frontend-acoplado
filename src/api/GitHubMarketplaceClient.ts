import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './cloudProviders';
import { templateToOffer, type TemplateYaml } from './templateParser';
import { dispatchProvision } from './dispatchProvision';

export { CLOUD_PROVIDERS };

export interface GitHubClientConfig {
  owner: string;
  repo: string;
  branch: string;
}

export const DEFAULT_GITHUB_CONFIG: GitHubClientConfig = {
  owner: '',
  repo: '',
  branch: 'main',
}

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

export class GitHubMarketplaceClient implements MarketplaceApi {
  private config: GitHubClientConfig;
  private providers: Provider[];
  private cache = new Map<string, Offer>();
  private blobsCache: { path: string }[] | null = null;

  constructor(config: Partial<GitHubClientConfig> = {}, providers: Provider[] = CLOUD_PROVIDERS) {
    this.config = { ...DEFAULT_GITHUB_CONFIG, ...config };
    this.providers = providers;
  }

  private async ghGet<T>(path: string): Promise<T> {
    const res = await fetch(`/github-api${path}?ref=${this.config.branch}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  private async fetchTreeBlobs(): Promise<{ path: string }[]> {
    if (this.blobsCache) return this.blobsCache;

    const { owner, repo, branch } = this.config;
    if (!owner || !repo) return [];

    type GHItem = { path: string; type: 'blob' | 'tree'; sha: string };

    const res = await fetch(
      `/github-api/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return [];

    const data = await res.json() as { tree: GHItem[]; truncated: boolean };
    if (!data.truncated) {
      this.blobsCache = data.tree.filter(i => i.type === 'blob');
      return this.blobsCache;
    }

    // Repo grande demais para fetch recursivo — traversal manual por subtree
    const blobs: { path: string }[] = [];

    const traverseSubtree = async (sha: string, prefix: string): Promise<void> => {
      const r = await fetch(
        `/github-api/repos/${owner}/${repo}/git/trees/${sha}`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!r.ok) return;
      const d = await r.json() as { tree: GHItem[] };
      await Promise.all(d.tree.map(item => {
        const fullPath = `${prefix}/${item.path}`;
        if (item.type === 'blob') { blobs.push({ path: fullPath }); return Promise.resolve(); }
        if (item.type === 'tree') return traverseSubtree(item.sha, fullPath);
        return Promise.resolve();
      }));
    };

    const rootRes = await fetch(
      `/github-api/repos/${owner}/${repo}/git/trees/${branch}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!rootRes.ok) return [];
    const rootData = await rootRes.json() as { tree: GHItem[] };

    await Promise.all(rootData.tree.map(item => {
      if (item.type === 'blob') { blobs.push({ path: item.path }); return Promise.resolve(); }
      if (item.type === 'tree') return traverseSubtree(item.sha, item.path);
      return Promise.resolve();
    }));

    this.blobsCache = blobs;
    return blobs;
  }

  private async fetchTemplateByPath(repoPath: string): Promise<Offer | null> {
    const { owner, repo } = this.config;
    try {
      const file = await this.ghGet<{ content: string }>(
        `/repos/${owner}/${repo}/contents/${repoPath}`
      );
      const tpl = parseYaml(decodeBase64(file.content)) as TemplateYaml;
      return templateToOffer(tpl);
    } catch {
      return null;
    }
  }

  private async fetchAllOffers(): Promise<Offer[]> {
    const { owner, repo } = this.config;
    if (!owner || !repo) return [];

    let blobs: { path: string }[];
    try {
      blobs = await this.fetchTreeBlobs();
    } catch {
      return [];
    }

    const templatePaths = blobs
      .filter(i => /^template\.ya?ml$/i.test(i.path.split('/').at(-1)!))
      .map(i => i.path);

    const byFolder = new Map<string, string[]>();
    for (const p of templatePaths) {
      const folder = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(raiz)';
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), p]);
    }
    const conflicts = [...byFolder.entries()].filter(([, paths]) => paths.length > 1);
    if (conflicts.length > 0) {
      const detail = conflicts.map(([folder, paths]) => `  ${folder}: ${paths.join(', ')}`).join('\n');
      throw new Error(`Múltiplos template.yaml encontrados na mesma pasta:\n${detail}`);
    }

    const results = await Promise.all(templatePaths.map(p => this.fetchTemplateByPath(p)));
    const offers = results.filter((o): o is Offer => o !== null);
    offers.forEach(o => this.cache.set(o.id, o));
    return offers;
  }

  async getProviders(): Promise<Provider[]> {
    const offers = await this.fetchAllOffers();
    const providerIds = [...new Set(offers.map(o => o.providerId))];
    return providerIds
      .map(id => this.providers.find(p => p.id === id))
      .filter((p): p is Provider => p !== undefined);
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    const offers = await this.fetchAllOffers();
    let filtered = offers.filter(o => o.providerId === providerId);
    if (filters?.category) filtered = filtered.filter(o => o.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async getAllOffers(filters?: { search?: string }): Promise<Offer[]> {
    let offers = await this.fetchAllOffers();
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      offers = offers.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return offers;
  }

  async getOfferById(offerId: string): Promise<Offer> {
    if (this.cache.has(offerId)) return this.cache.get(offerId)!;
    const offers = await this.fetchAllOffers();
    const offer = offers.find(o => o.id === offerId);
    if (offer) return offer;
    throw new Error(`Oferta não encontrada: ${offerId}`);
  }

  async provision(request: ProvisioningRequest): Promise<ProvisioningResponse> {
    return dispatchProvision({ owner: this.config.owner, repo: this.config.repo }, request);
  }
}
