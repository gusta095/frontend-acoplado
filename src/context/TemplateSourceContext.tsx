import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MarketplaceApi } from '../api/MarketplaceApi';
import { GitHubMarketplaceClient, DEFAULT_GITHUB_CONFIG } from '../api/GitHubMarketplaceClient';
import type { GitHubClientConfig } from '../api/GitHubMarketplaceClient';
import { LocalServerMarketplaceClient } from '../api/LocalServerMarketplaceClient';

export type TemplateSource = 'github' | 'local';

const STORAGE_KEY = 'cloud-marketplace:template-source';

interface PersistedState {
  source: TemplateSource;
  githubConfig: GitHubClientConfig;
  localPath: string;
  autoReload: boolean;
}

const defaultPersisted: PersistedState = {
  source: 'local',
  githubConfig: DEFAULT_GITHUB_CONFIG,
  localPath: '',
  autoReload: false,
};

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultPersisted, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return defaultPersisted;
}

interface TemplateSourceContextValue {
  source: TemplateSource;
  githubConfig: GitHubClientConfig;
  localPath: string;
  autoReload: boolean;
  cloudClient: MarketplaceApi;
  setSource: (source: TemplateSource) => void;
  setGitHubConfig: (config: GitHubClientConfig) => void;
  setLocalPath: (path: string) => void;
  setAutoReload: (value: boolean) => void;
}

const TemplateSourceContext = createContext<TemplateSourceContextValue | null>(null);

export function TemplateSourceProvider({ children }: { children: React.ReactNode }) {
  const persisted = loadPersistedState();
  const [source, setSourceState] = useState<TemplateSource>(persisted.source);
  const [githubConfig, setGitHubConfigState] = useState<GitHubClientConfig>(persisted.githubConfig);
  const [localPath, setLocalPathState] = useState<string>(persisted.localPath);
  const [autoReload, setAutoReloadState] = useState(persisted.autoReload);

  function persist(patch: Partial<PersistedState>) {
    try {
      const current = loadPersistedState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
    } catch { /* ignore */ }
  }

  const setSource = useCallback((s: TemplateSource) => {
    setSourceState(s);
    persist({ source: s });
  }, []);

  const setGitHubConfig = useCallback((config: GitHubClientConfig) => {
    setGitHubConfigState(config);
    persist({ githubConfig: config });
  }, []);

  const setLocalPath = useCallback((p: string) => {
    setLocalPathState(p);
    persist({ localPath: p });
  }, []);

  const setAutoReload = useCallback((value: boolean) => {
    setAutoReloadState(value);
    persist({ autoReload: value });
  }, []);

  const cloudClient = useMemo((): MarketplaceApi => {
    if (source === 'local' && localPath.trim()) {
      return new LocalServerMarketplaceClient(localPath.trim());
    }
    return new GitHubMarketplaceClient(githubConfig);
  }, [source, localPath, githubConfig]);

  return (
    <TemplateSourceContext.Provider value={{
      source, githubConfig, localPath, autoReload, cloudClient,
      setSource, setGitHubConfig, setLocalPath, setAutoReload,
    }}>
      {children}
    </TemplateSourceContext.Provider>
  );
}

export function useTemplateSource(): TemplateSourceContextValue {
  const ctx = useContext(TemplateSourceContext);
  if (!ctx) throw new Error('useTemplateSource must be used within TemplateSourceProvider');
  return ctx;
}
