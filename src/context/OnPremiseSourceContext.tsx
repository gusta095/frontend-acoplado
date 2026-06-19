// @refresh reset
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MarketplaceApi } from '../api/MarketplaceApi';
import {
  GitHubMarketplaceClient,
  MergedMarketplaceClient,
  createClientFromSource,
} from '../api/MarketplaceClient';
import { ON_PREMISE_PROVIDERS } from '../api/onPremiseProviders';

const STORAGE_KEY = 'on-premise:template-source';

interface PersistedState {
  sources: string[];
  autoReload: boolean;
}

const defaultPersisted: PersistedState = {
  sources: [],
  autoReload: false,
};

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // Migra formato antigo (source + githubConfig + localPath) para sources: string[]
      if ('source' in parsed) {
        const sources: string[] = [];
        if (parsed.source === 'local' && typeof parsed.localPath === 'string' && parsed.localPath.trim()) {
          sources.push(parsed.localPath.trim());
        } else if (parsed.source === 'github') {
          const cfg = parsed.githubConfig as { owner?: string; repo?: string; branch?: string } | undefined;
          if (cfg?.owner && cfg?.repo) {
            const branch = cfg.branch && cfg.branch !== 'main' ? `/tree/${cfg.branch}` : '';
            sources.push(`https://github.com/${cfg.owner}/${cfg.repo}${branch}`);
          }
        }
        return { sources, autoReload: typeof parsed.autoReload === 'boolean' ? parsed.autoReload : false };
      }
      return { ...defaultPersisted, ...(parsed as Partial<PersistedState>) };
    }
  } catch { /* ignore */ }
  return defaultPersisted;
}

interface OnPremiseSourceContextValue {
  sources: string[];
  autoReload: boolean;
  onPremiseClient: MarketplaceApi;
  setSources: (sources: string[]) => void;
  setAutoReload: (value: boolean) => void;
}

const OnPremiseSourceContext = createContext<OnPremiseSourceContextValue | null>(null);

export function OnPremiseSourceProvider({ children }: { children: React.ReactNode }) {
  const persisted = loadPersistedState();
  const [sources, setSourcesState] = useState<string[]>(persisted.sources);
  const [autoReload, setAutoReloadState] = useState(persisted.autoReload);

  function persist(patch: Partial<PersistedState>) {
    try {
      const current = loadPersistedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    } catch { /* ignore */ }
  }

  const setSources = useCallback((s: string[]) => {
    setSourcesState(s);
    persist({ sources: s });
  }, []);

  const setAutoReload = useCallback((value: boolean) => {
    setAutoReloadState(value);
    persist({ autoReload: value });
  }, []);

  const onPremiseClient = useMemo((): MarketplaceApi => {
    const valid = sources.map(s => s.trim()).filter(Boolean);
    if (valid.length === 0) return new GitHubMarketplaceClient(undefined, ON_PREMISE_PROVIDERS);
    if (valid.length === 1) return createClientFromSource(valid[0], ON_PREMISE_PROVIDERS);
    return new MergedMarketplaceClient(valid.map(s => createClientFromSource(s, ON_PREMISE_PROVIDERS)));
  }, [sources]);

  return (
    <OnPremiseSourceContext.Provider value={{ sources, autoReload, onPremiseClient, setSources, setAutoReload }}>
      {children}
    </OnPremiseSourceContext.Provider>
  );
}

export function useOnPremiseSource(): OnPremiseSourceContextValue {
  const ctx = useContext(OnPremiseSourceContext);
  if (!ctx) throw new Error('useOnPremiseSource must be used within OnPremiseSourceProvider');
  return ctx;
}
