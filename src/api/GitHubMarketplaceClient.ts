import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './cloudProviders';
import { templateToOffer, type TemplateYaml } from './templateParser';
import { provisionToGitHub, type SkeletonFile } from './provisionToGitHub';

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
  private skeletonPrefixCache = new Map<string, string>(); // offerId → skeleton path prefix in repo

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

  private async fetchTemplateByPath(repoPath: string): Promise<Offer | null> {
    const { owner, repo } = this.config;
    try {
      const file = await this.ghGet<{ content: string }>(
        `/repos/${owner}/${repo}/contents/${repoPath}`
      );
      const tpl = parseYaml(decodeBase64(file.content)) as TemplateYaml;
      const slug = repoPath.split('/').at(-2)!;
      const offer = templateToOffer(slug, tpl);
      // Store skeleton prefix: e.g. "templates/aws/s3/skeleton/"
      const skeletonPrefix = repoPath.replace(/template\.ya?ml$/i, 'skeleton/');
      this.skeletonPrefixCache.set(slug, skeletonPrefix);
      return offer;
    } catch {
      return null;
    }
  }

  private async fetchAllOffers(): Promise<Offer[]> {
    const { owner, repo, branch } = this.config;
    if (!owner || !repo) return [];
    type TreeItem = { path: string; type: 'blob' | 'tree' };
    let items: TreeItem[];
    try {
      const tree = await fetch(
        `/github-api/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!tree.ok) return [];
      const data = await tree.json() as { tree: TreeItem[] };
      items = data.tree;
    } catch {
      return [];
    }

    const templatePaths = items
      .filter(i => i.type === 'blob' && /^template\.ya?ml$/i.test(i.path.split('/').at(-1)!))
      .map(i => i.path);

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
    const repoName = String(request.parameters.repo_name ?? `${request.offerId}-${Date.now()}`);
    const timestamp = new Date().toISOString();

    // Ensure skeleton prefix is loaded
    if (!this.skeletonPrefixCache.has(request.offerId)) {
      await this.fetchAllOffers();
    }
    const skeletonPrefix = this.skeletonPrefixCache.get(request.offerId);
    if (!skeletonPrefix) {
      return { requestId: '', status: 'failed', message: `Template "${request.offerId}" não encontrado`, timestamp };
    }

    const { owner, repo, branch } = this.config;

    // Fetch full tree to find skeleton files
    let treeItems: { path: string; type: string }[];
    try {
      const treeRes = await fetch(
        `/github-api/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!treeRes.ok) return { requestId: '', status: 'failed', message: 'Erro ao acessar repositório de templates', timestamp };
      const data = await treeRes.json() as { tree: { path: string; type: string }[] };
      treeItems = data.tree;
    } catch {
      return { requestId: '', status: 'failed', message: 'Erro de conexão com o GitHub', timestamp };
    }

    const skeletonBlobs = treeItems.filter(i => i.type === 'blob' && i.path.startsWith(skeletonPrefix));
    if (skeletonBlobs.length === 0) {
      return { requestId: '', status: 'failed', message: `Nenhum arquivo encontrado em ${skeletonPrefix}`, timestamp };
    }

    // Fetch and decode each skeleton file
    const files: SkeletonFile[] = [];
    for (const item of skeletonBlobs) {
      try {
        const file = await this.ghGet<{ content: string }>(`/repos/${owner}/${repo}/contents/${item.path}`);
        const content = decodeBase64(file.content);
        const relativePath = item.path.slice(skeletonPrefix.length);
        files.push({ path: relativePath, content });
      } catch {
        return { requestId: '', status: 'failed', message: `Erro ao ler ${item.path}`, timestamp };
      }
    }

    return provisionToGitHub(repoName, files, request.parameters);
  }
}
