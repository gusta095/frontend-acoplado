// @refresh reset
import React, { createContext, useContext } from 'react';
import type { MarketplaceApi } from '../api/MarketplaceApi';

interface MarketplaceClientContextValue {
  client: MarketplaceApi;
  basePath: string;
  marketplaceName: string;
}

const MarketplaceClientContext = createContext<MarketplaceClientContextValue | null>(null);

interface Props extends MarketplaceClientContextValue {
  children: React.ReactNode;
}

export function MarketplaceClientProvider({ client, basePath, marketplaceName, children }: Props) {
  return (
    <MarketplaceClientContext.Provider value={{ client, basePath, marketplaceName }}>
      {children}
    </MarketplaceClientContext.Provider>
  );
}

export function useMarketplaceClient(): MarketplaceClientContextValue {
  const ctx = useContext(MarketplaceClientContext);
  if (!ctx) throw new Error('useMarketplaceClient must be used within MarketplaceClientProvider');
  return ctx;
}
