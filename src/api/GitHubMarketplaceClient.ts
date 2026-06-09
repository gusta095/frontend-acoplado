import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, OfferParameter, ParameterType, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './cloudProviders';

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
};

interface TemplateYaml {
  name: string;
  title: string;
  description: string;
  provider: string;
  category?: OfferCategory;
  tags?: string[];
  schema: {
    required?: string[];
    properties: Record<string, {
      type?: string;
      title?: string;
      description?: string;
      default?: unknown;
      enum?: string[];
      pattern?: string;
      minLength?: number;
      maxLength?: number;
      minimum?: number;
      maximum?: number;
    }>;
  };
}

function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

function mapParameters(schema: TemplateYaml['schema']): OfferParameter[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([key, prop]) => {
    let type: ParameterType;
    if (prop.enum?.length) {
      type = 'select';
    } else if (prop.type === 'integer' || prop.type === 'number') {
      type = 'number';
    } else if (prop.type === 'boolean') {
      type = 'boolean';
    } else {
      type = 'string';
    }

    const param: OfferParameter = {
      key,
      label: prop.title ?? key,
      type,
      required: required.has(key),
      description: prop.description,
      defaultValue: prop.default !== undefined ? String(prop.default) : undefined,
      options: prop.enum,
    };

    if (prop.pattern || prop.minLength !== undefined || prop.maxLength !== undefined || prop.minimum !== undefined || prop.maximum !== undefined) {
      param.validation = {
        pattern: prop.pattern,
        minLength: prop.minLength,
        maxLength: prop.maxLength,
        min: prop.minimum,
        max: prop.maximum,
      };
    }

    return param;
  });
}

function templateToOffer(slug: string, tpl: TemplateYaml): Offer {
  return {
    id: slug,
    providerId: tpl.provider as ProviderId,
    name: tpl.title,
    shortDescription: tpl.description,
    longDescription: tpl.description,
    category: tpl.category ?? 'other',
    tags: tpl.tags,
    parameters: mapParameters(tpl.schema),
  };
}

export class GitHubMarketplaceClient implements MarketplaceApi {
  private config: GitHubClientConfig;
  private providers: Provider[];
  private cache = new Map<string, Offer>();

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
      // slug = name of the folder containing template.yaml
      const slug = repoPath.split('/').at(-2)!;
      return templateToOffer(slug, tpl);
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
    await new Promise(res => setTimeout(res, 1500));
    return {
      requestId: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'accepted',
      message: `Provisionamento de "${request.offerId}" aceito.`,
      timestamp: new Date().toISOString(),
    };
  }
}
