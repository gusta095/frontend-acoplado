import { useEffect, useState } from 'react';
import type { Offer } from '../types';
import { MockMarketplaceClient } from '../api/MockMarketplaceClient';

const client = new MockMarketplaceClient();

export function useOfferDetail(offerId: string) {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!offerId) return;
    setLoading(true);
    client.getOfferById(offerId)
      .then(setOffer)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [offerId]);

  return { offer, loading, error };
}
