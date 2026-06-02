import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import mockData from '../mocks/onpremise.mock.json';

const delay = (ms = 400) => new Promise(res => setTimeout(res, ms));

export class MockOnPremiseClient implements MarketplaceApi {
  async getProviders(): Promise<Provider[]> {
    await delay();
    return mockData.providers as Provider[];
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    await delay();
    let offers = (mockData.offers as Offer[]).filter(o => o.providerId === providerId);
    if (filters?.category) {
      offers = offers.filter(o => o.category === filters.category);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      offers = offers.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return offers;
  }

  async getAllOffers(filters?: { search?: string }): Promise<Offer[]> {
    await delay(200);
    let offers = mockData.offers as Offer[];
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      offers = offers.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return offers;
  }

  async getOfferById(offerId: string): Promise<Offer> {
    await delay();
    const offer = (mockData.offers as Offer[]).find(o => o.id === offerId);
    if (!offer) throw new Error(`Oferta não encontrada: ${offerId}`);
    return offer;
  }

  async provision(request: ProvisioningRequest): Promise<ProvisioningResponse> {
    await delay(1500);
    if (Math.random() < 0.1) {
      return {
        requestId: '',
        status: 'failed',
        message: 'Erro simulado: recurso indisponível no hypervisor selecionado.',
        timestamp: new Date().toISOString(),
      };
    }
    return {
      requestId: `prov-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'accepted',
      message: `Provisionamento de "${request.offerId}" iniciado com sucesso.`,
      timestamp: new Date().toISOString(),
    };
  }
}
