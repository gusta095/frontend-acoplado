import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './GitHubMarketplaceClient';
import { templateToOffer, type TemplateYaml } from './templateParser';
import { provisionToGitHub, type SkeletonFile } from './provisionToGitHub';

async function scanTemplates(root: string): Promise<string[]> {
  const res = await fetch(`/local-templates?action=scan&path=${encodeURIComponent(root)}`);
  if (!res.ok) return [];
  return res.json() as Promise<string[]>;
}

async function scanAllFiles(dir: string): Promise<string[]> {
  const res = await fetch(`/local-templates?action=scanAll&path=${encodeURIComponent(dir)}`);
  if (!res.ok) return [];
  return res.json() as Promise<string[]>;
}

async function readFile(absPath: string): Promise<string | null> {
  const res = await fetch(`/local-templates?action=read&path=${encodeURIComponent(absPath)}`);
  if (!res.ok) return null;
  const data = await res.json() as { content: string };
  return data.content;
}

export class LocalServerMarketplaceClient implements MarketplaceApi {
  private cache = new Map<string, Offer>();
  private absPathCache = new Map<string, string>(); // offerId → abs path of template.yaml
  private root: string;
  private providers: Provider[];

  constructor(templatesRoot: string, providers: Provider[] = CLOUD_PROVIDERS) {
    this.root = templatesRoot.replace(/\/+$/, '');
    this.providers = providers;
  }

  private async fetchTemplateYaml(absPath: string): Promise<Offer | null> {
    const content = await readFile(absPath);
    if (!content) return null;
    try {
      const tpl = parseYaml(content) as TemplateYaml;
      const offer = templateToOffer(tpl);
      this.absPathCache.set(offer.id, absPath);
      return offer;
    } catch {
      return null;
    }
  }

  private async fetchAllOffers(): Promise<Offer[]> {
    const paths = await scanTemplates(this.root);

    const byFolder = new Map<string, string[]>();
    for (const p of paths) {
      const folder = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(raiz)';
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), p]);
    }
    const conflicts = [...byFolder.entries()].filter(([, ps]) => ps.length > 1);
    if (conflicts.length > 0) {
      const detail = conflicts.map(([folder, ps]) => `  ${folder}: ${ps.join(', ')}`).join('\n');
      throw new Error(`Múltiplos template.yaml encontrados na mesma pasta:\n${detail}`);
    }

    const results = await Promise.all(paths.map(p => this.fetchTemplateYaml(p)));
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

    // Ensure template path is cached
    if (!this.absPathCache.has(request.offerId)) {
      await this.fetchAllOffers();
    }
    const templateAbsPath = this.absPathCache.get(request.offerId);
    if (!templateAbsPath) {
      return { requestId: '', status: 'failed', message: `Template "${request.offerId}" não encontrado`, timestamp };
    }

    // Derive skeleton root: replace "template.yaml" with "skeleton"
    const skeletonRoot = templateAbsPath.replace(/\/template\.ya?ml$/i, '/skeleton');

    // List all files under skeleton
    const allPaths = await scanAllFiles(skeletonRoot);
    if (allPaths.length === 0) {
      return { requestId: '', status: 'failed', message: `Nenhum arquivo encontrado em ${skeletonRoot}`, timestamp };
    }

    // Read each file
    const files: SkeletonFile[] = [];
    for (const absPath of allPaths) {
      const content = await readFile(absPath);
      if (content === null) continue;
      // Path relative to skeletonRoot, e.g. "main.tf" or ".github/workflows/terraform.yml"
      const relativePath = absPath.slice(skeletonRoot.length + 1);
      files.push({ path: relativePath, content });
    }

    return provisionToGitHub(repoName, files, request.parameters);
  }
}
