import { useState } from 'react';
import type { ProvisioningRequest, ProvisioningResponse } from '../types';
import { useMarketplaceClient } from '../context/MarketplaceClientContext';

export function useProvisioning() {
  const { client } = useMarketplaceClient();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProvisioningResponse[]>([]);

  const provision = async (request: ProvisioningRequest): Promise<ProvisioningResponse> => {
    setLoading(true);
    try {
      const res = await client.provision(request);
      setResults(prev => [...prev, res]);
      return res;
    } finally {
      setLoading(false);
    }
  };

  const provisionAll = async (requests: ProvisioningRequest[]): Promise<ProvisioningResponse[]> => {
    setLoading(true);
    setResults([]);
    const responses: ProvisioningResponse[] = [];
    for (const req of requests) {
      const res = await client.provision(req);
      responses.push(res);
      setResults(prev => [...prev, res]);
    }
    setLoading(false);
    return responses;
  };

  return { loading, results, provision, provisionAll };
}
