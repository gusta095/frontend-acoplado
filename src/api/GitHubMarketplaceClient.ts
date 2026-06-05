import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, OfferParameter, ParameterType, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';

export interface GitHubClientConfig {
  owner: string;
  repo: string;
  branch: string;
  templatesPath: string;
}

export const DEFAULT_GITHUB_CONFIG: GitHubClientConfig = {
  owner: 'gusta-lab',
  repo: 'platform-templates-offers',
  branch: 'main',
  templatesPath: 'templates',
};

export const CLOUD_PROVIDERS: Provider[] = [
  { id: 'aws',   name: 'Amazon Web Services',        shortName: 'AWS',   logoUrl: '', accentColor: '#FF9900', description: 'Compute, storage, databases e mais na maior cloud do mundo.' },
  { id: 'azure', name: 'Microsoft Azure',             shortName: 'Azure', logoUrl: '', accentColor: '#0078D4', description: 'Serviços cloud da Microsoft com integração nativa ao ecossistema enterprise.' },
  { id: 'oci',   name: 'Oracle Cloud Infrastructure', shortName: 'OCI',   logoUrl: '', accentColor: '#C74634', description: 'Infraestrutura de alto desempenho com foco em workloads críticos.' },
];

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
  private cache = new Map<string, Offer>();

  constructor(config: Partial<GitHubClientConfig> = {}) {
    this.config = { ...DEFAULT_GITHUB_CONFIG, ...config };
  }

  private async ghGet<T>(path: string): Promise<T> {
    const res = await fetch(`/github-api${path}?ref=${this.config.branch}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  private async fetchTemplateYaml(provider: string, slug: string): Promise<Offer | null> {
    const { owner, repo, templatesPath } = this.config;
    try {
      const file = await this.ghGet<{ content: string }>(
        `/repos/${owner}/${repo}/contents/${templatesPath}/${provider}/${slug}/template.yaml`
      );
      const tpl = parseYaml(decodeBase64(file.content)) as TemplateYaml;
      return templateToOffer(slug, tpl);
    } catch {
      return null;
    }
  }

  async getProviders(): Promise<Provider[]> {
    const { owner, repo, templatesPath } = this.config;
    type Entry = { name: string; type: 'file' | 'dir' };
    try {
      const entries = await this.ghGet<Entry[]>(`/repos/${owner}/${repo}/contents/${templatesPath}`);
      const folderNames = new Set(entries.filter(e => e.type === 'dir').map(e => e.name));
      return CLOUD_PROVIDERS.filter(p => folderNames.has(p.id));
    } catch {
      return CLOUD_PROVIDERS;
    }
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    const { owner, repo, templatesPath } = this.config;
    type Entry = { name: string; type: 'file' | 'dir' };
    let entries: Entry[];
    try {
      entries = await this.ghGet<Entry[]>(`/repos/${owner}/${repo}/contents/${templatesPath}/${providerId}`);
    } catch {
      return [];
    }

    const slugs = entries.filter(e => e.type === 'dir').map(e => e.name);
    const results = await Promise.all(slugs.map(slug => this.fetchTemplateYaml(providerId, slug)));
    const offers = results.filter((o): o is Offer => o !== null);

    offers.forEach(o => this.cache.set(o.id, o));

    let filtered = offers;
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
    const all = await Promise.all(CLOUD_PROVIDERS.map(p => this.getOffers(p.id)));
    let offers = all.flat();
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
    for (const provider of CLOUD_PROVIDERS) {
      const offer = await this.fetchTemplateYaml(provider.id, offerId);
      if (offer) {
        this.cache.set(offerId, offer);
        return offer;
      }
    }
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
