// @refresh reset
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MarketplaceApi } from '../api/MarketplaceApi';
import {
  GitHubMarketplaceClient,
  MergedMarketplaceClient,
  createClientFromSource,
} from '../api/MarketplaceClient';

const STORAGE_KEY = 'cloud-marketplace:template-source';

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

interface TemplateSourceContextValue {
  sources: string[];
  autoReload: boolean;
  cloudClient: MarketplaceApi;
  setSources: (sources: string[]) => void;
  setAutoReload: (value: boolean) => void;
}

const TemplateSourceContext = createContext<TemplateSourceContextValue | null>(null);

export function TemplateSourceProvider({ children }: { children: React.ReactNode }) {
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

  const cloudClient = useMemo((): MarketplaceApi => {
    const valid = sources.map(s => s.trim()).filter(Boolean);
    if (valid.length === 0) return new GitHubMarketplaceClient();
    if (valid.length === 1) return createClientFromSource(valid[0]);
    return new MergedMarketplaceClient(valid.map(s => createClientFromSource(s)));
  }, [sources]);

  return (
    <TemplateSourceContext.Provider value={{ sources, autoReload, cloudClient, setSources, setAutoReload }}>
      {children}
    </TemplateSourceContext.Provider>
  );
}

export function useTemplateSource(): TemplateSourceContextValue {
  const ctx = useContext(TemplateSourceContext);
  if (!ctx) throw new Error('useTemplateSource must be used within TemplateSourceProvider');
  return ctx;
}
