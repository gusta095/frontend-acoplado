// @refresh reset
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { MarketplaceApi } from '../api/MarketplaceApi';
import { GitHubMarketplaceClient } from '../api/GitHubMarketplaceClient';
import type { GitHubClientConfig } from '../api/GitHubMarketplaceClient';
import { LocalServerMarketplaceClient } from '../api/LocalServerMarketplaceClient';
import { ON_PREMISE_PROVIDERS } from '../api/onPremiseProviders';

export type TemplateSource = 'github' | 'local';

const STORAGE_KEY = 'on-premise:template-source';

const DEFAULT_GITHUB_CONFIG: GitHubClientConfig = {
  owner: '',
  repo: '',
  branch: 'main',
};

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

interface OnPremiseSourceContextValue {
  source: TemplateSource;
  githubConfig: GitHubClientConfig;
  localPath: string;
  autoReload: boolean;
  onPremiseClient: MarketplaceApi;
  setSource: (source: 'github' | 'local') => void;
  setGitHubConfig: (config: GitHubClientConfig) => void;
  setLocalPath: (path: string) => void;
  setAutoReload: (value: boolean) => void;
}

const OnPremiseSourceContext = createContext<OnPremiseSourceContextValue | null>(null);

export function OnPremiseSourceProvider({ children }: { children: React.ReactNode }) {
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

  const onPremiseClient = useMemo((): MarketplaceApi => {
    if (source === 'local' && localPath.trim()) {
      return new LocalServerMarketplaceClient(localPath.trim(), ON_PREMISE_PROVIDERS);
    }
    if (source === 'github' && githubConfig.owner && githubConfig.repo) {
      return new GitHubMarketplaceClient(githubConfig, ON_PREMISE_PROVIDERS);
    }
    return new LocalServerMarketplaceClient('', ON_PREMISE_PROVIDERS);
  }, [source, localPath, githubConfig]);

  return (
    <OnPremiseSourceContext.Provider value={{
      source, githubConfig, localPath, autoReload, onPremiseClient,
      setSource, setGitHubConfig, setLocalPath, setAutoReload,
    }}>
      {children}
    </OnPremiseSourceContext.Provider>
  );
}

export function useOnPremiseSource(): OnPremiseSourceContextValue {
  const ctx = useContext(OnPremiseSourceContext);
  if (!ctx) throw new Error('useOnPremiseSource must be used within OnPremiseSourceProvider');
  return ctx;
}
