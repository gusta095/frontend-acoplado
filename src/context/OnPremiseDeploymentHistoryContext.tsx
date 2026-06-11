// @refresh reset
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

interface OnPremiseDeploymentHistoryContextValue {
  batches: DeploymentBatch[];
  addBatch: (batch: DeploymentBatch) => void;
  getBatch: (batchId: string) => DeploymentBatch | undefined;
}

const STORAGE_KEY = 'on-premise:deployment-history';

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
  } catch { /* quota exceeded */ }
}

const OnPremiseDeploymentHistoryContext = createContext<OnPremiseDeploymentHistoryContextValue | null>(null);

export function OnPremiseDeploymentHistoryProvider({ children }: { children: React.ReactNode }) {
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
    <OnPremiseDeploymentHistoryContext.Provider value={{ batches, addBatch, getBatch }}>
      {children}
    </OnPremiseDeploymentHistoryContext.Provider>
  );
}

export function useOnPremiseDeploymentHistory(): OnPremiseDeploymentHistoryContextValue {
  const ctx = useContext(OnPremiseDeploymentHistoryContext);
  if (!ctx) throw new Error('useOnPremiseDeploymentHistory must be used within OnPremiseDeploymentHistoryProvider');
  return ctx;
}
