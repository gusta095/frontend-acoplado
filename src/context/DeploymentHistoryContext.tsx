import React, { createContext, useCallback, useContext, useState } from 'react';
import type { CartItem, ProvisioningResponse } from '../types';

export interface DeploymentResult {
  itemId: string;
  response: ProvisioningResponse;
}

export interface DeploymentBatch {
  batchId: string;
  timestamp: string;
  snapshot: CartItem[];
  results: DeploymentResult[];
}

interface DeploymentHistoryContextValue {
  batches: DeploymentBatch[];
  addBatch: (batch: DeploymentBatch) => void;
  getBatch: (batchId: string) => DeploymentBatch | undefined;
}

const STORAGE_KEY = 'cloud-marketplace:deployment-history';

function loadFromStorage(): DeploymentBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(batches: DeploymentBatch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch {
    // quota exceeded — silently ignore
  }
}

const DeploymentHistoryContext = createContext<DeploymentHistoryContextValue | null>(null);

export function DeploymentHistoryProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<DeploymentBatch[]>(loadFromStorage);

  const addBatch = useCallback((batch: DeploymentBatch) => {
    setBatches(prev => {
      const next = [batch, ...prev];
      saveToStorage(next);
      return next;
    });
  }, []);

  const getBatch = useCallback(
    (batchId: string) => batches.find(b => b.batchId === batchId),
    [batches],
  );

  return (
    <DeploymentHistoryContext.Provider value={{ batches, addBatch, getBatch }}>
      {children}
    </DeploymentHistoryContext.Provider>
  );
}

export function useDeploymentHistory(): DeploymentHistoryContextValue {
  const ctx = useContext(DeploymentHistoryContext);
  if (!ctx) throw new Error('useDeploymentHistory must be used within DeploymentHistoryProvider');
  return ctx;
}
