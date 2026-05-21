import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';

export interface MarketplaceApi {
  getProviders(): Promise<Provider[]>;
  getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]>;
  getAllOffers(filters?: { search?: string }): Promise<Offer[]>;
  getOfferById(offerId: string): Promise<Offer>;
  provision(request: ProvisioningRequest): Promise<ProvisioningResponse>;
}
