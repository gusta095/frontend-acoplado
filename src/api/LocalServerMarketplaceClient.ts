import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './GitHubMarketplaceClient';
import { templateToOffer, type TemplateYaml } from './templateParser';

async function scanTemplates(root: string): Promise<string[]> {
  const res = await fetch(`/local-templates?action=scan&path=${encodeURIComponent(root)}`);
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
      const slug = absPath.split('/').at(-2)!;
      return templateToOffer(slug, tpl);
    } catch {
      return null;
    }
  }

  private async fetchAllOffers(): Promise<Offer[]> {
    const paths = await scanTemplates(this.root);
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
    await new Promise(res => setTimeout(res, 1500));
    return {
      requestId: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'accepted',
      message: `Provisionamento de "${request.offerId}" aceito.`,
      timestamp: new Date().toISOString(),
    };
  }
}
