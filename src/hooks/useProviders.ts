import { useEffect, useState } from 'react';
import type { Provider } from '../types';
import { MockMarketplaceClient } from '../api/MockMarketplaceClient';

const client = new MockMarketplaceClient();

export function useProviders() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    client.getProviders()
      .then(setProviders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { providers, loading, error };
}
