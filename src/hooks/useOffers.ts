import { useEffect, useState } from 'react';
import type { Offer, OfferCategory, ProviderId } from '../types';
import { useMarketplaceClient } from '../context/MarketplaceClientContext';

export function useOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }) {
  const { client } = useMarketplaceClient();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    client.getOffers(providerId, filters)
      .then(setOffers)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client, providerId, filters?.category, filters?.search]);

  return { offers, loading, error };
}
