import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, OfferParameter, ParameterType, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './GitHubMarketplaceClient';

type Entry = { name: string; type: 'file' | 'dir' };

async function listDir(absPath: string): Promise<Entry[]> {
  const res = await fetch(`/local-templates?action=list&path=${encodeURIComponent(absPath)}`);
  if (!res.ok) return [];
  return res.json() as Promise<Entry[]>;
}

async function readFile(absPath: string): Promise<string | null> {
  const res = await fetch(`/local-templates?action=read&path=${encodeURIComponent(absPath)}`);
  if (!res.ok) return null;
  const data = await res.json() as { content: string };
  return data.content;
}

function mapParameters(schema: {
  required?: string[];
  properties: Record<string, {
    type?: string; title?: string; description?: string; default?: unknown;
    enum?: string[]; pattern?: string; minLength?: number; maxLength?: number;
    minimum?: number; maximum?: number;
  }>;
}): OfferParameter[] {
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([key, prop]) => {
    let type: ParameterType;
    if (prop.enum?.length) type = 'select';
    else if (prop.type === 'integer' || prop.type === 'number') type = 'number';
    else if (prop.type === 'boolean') type = 'boolean';
    else type = 'string';

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
      param.validation = { pattern: prop.pattern, minLength: prop.minLength, maxLength: prop.maxLength, min: prop.minimum, max: prop.maximum };
    }

    return param;
  });
}

export class LocalServerMarketplaceClient implements MarketplaceApi {
  private cache = new Map<string, Offer>();
  private root: string;

  constructor(templatesRoot: string) {
    this.root = templatesRoot.replace(/\/+$/, '');
  }

  private async fetchTemplateYaml(provider: string, slug: string): Promise<Offer | null> {
    const content = await readFile(`${this.root}/${provider}/${slug}/template.yaml`);
    if (!content) return null;
    try {
      const tpl = parseYaml(content) as {
        title: string; description: string; provider: string;
        category?: OfferCategory; tags?: string[];
        schema: { required?: string[]; properties: Record<string, unknown> };
      };
      return {
        id: slug,
        providerId: tpl.provider as ProviderId,
        name: tpl.title,
        shortDescription: tpl.description,
        longDescription: tpl.description,
        category: tpl.category ?? 'other',
        tags: tpl.tags,
        parameters: mapParameters(tpl.schema as Parameters<typeof mapParameters>[0]),
      };
    } catch {
      return null;
    }
  }

  async getProviders(): Promise<Provider[]> {
    const entries = await listDir(this.root);
    const found = entries
      .filter(e => e.type === 'dir')
      .map(e => CLOUD_PROVIDERS.find(p => p.id === e.name))
      .filter((p): p is Provider => p !== undefined);
    return found;
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    const entries = await listDir(`${this.root}/${providerId}`);
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
    const providers = await this.getProviders();
    const all = await Promise.all(providers.map(p => this.getOffers(p.id)));
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
    const providers = await this.getProviders();
    for (const provider of providers) {
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
