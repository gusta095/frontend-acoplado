import { useEffect, useState } from 'react';
import type { Offer, OfferCategory, ProviderId } from '../types';
import { MockMarketplaceClient } from '../api/MockMarketplaceClient';

const client = new MockMarketplaceClient();

export function useOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    client.getOffers(providerId, filters)
      .then(setOffers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [providerId, filters?.category, filters?.search]);

  return { offers, loading, error };
}
