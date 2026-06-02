import { useEffect, useState } from 'react';
import type { Provider } from '../types';
import { useMarketplaceClient } from '../context/MarketplaceClientContext';

export function useProviders() {
  const { client } = useMarketplaceClient();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    client.getProviders()
      .then(setProviders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [client]);

  return { providers, loading, error };
}
