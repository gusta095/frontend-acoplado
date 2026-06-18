// @refresh reset
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { CartItem, ProvisioningResponse } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionsStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
}

export interface ActionsStatus {
  runId?: number;
  runUrl?: string;
  status: 'pending' | 'queued' | 'in_progress' | 'completed';
  conclusion?: 'success' | 'failure' | 'cancelled' | null;
  steps?: ActionsStep[];
}

export interface DeploymentResult {
  itemId: string;
  response: ProvisioningResponse;
  actionsStatus?: ActionsStatus;
  startedAt?: string;
  completedAt?: string;
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

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cloud-marketplace:deployment-history';

function loadFromStorage(): DeploymentBatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DeploymentBatch[]) : [];
  } catch {
    return [];
  }
}

function saveToStorage(batches: DeploymentBatch[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(batches));
  } catch { /* quota exceeded */ }
}

// ─── Polling helpers ──────────────────────────────────────────────────────────

const SYSTEM_STEPS = new Set(['Set up job', 'Complete job']);

function isUserStep(s: { name: string }): boolean {
  return !SYSTEM_STEPS.has(s.name) && !s.name.startsWith('Post ');
}

function mapStepStatus(s: { status: string; conclusion: string | null }): ActionsStep['status'] {
  if (s.status === 'in_progress') return 'running';
  if (s.status === 'completed') {
    return s.conclusion === 'success' || s.conclusion === 'skipped' ? 'success' : 'failed';
  }
  return 'pending';
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const DeploymentHistoryContext = createContext<DeploymentHistoryContextValue | null>(null);

export function DeploymentHistoryProvider({ children }: { children: React.ReactNode }) {
  const [batches, setBatches] = useState<DeploymentBatch[]>(loadFromStorage);
  const registry = useRef(new Map<string, AbortController>());

  const updateItemActionsStatus = useCallback(
    (batchId: string, itemId: string, actionsStatus: ActionsStatus) => {
      setBatches(prev => {
        const next = prev.map(b => {
          if (b.batchId !== batchId) return b;
          return {
            ...b,
            results: b.results.map(r => {
              if (r.itemId !== itemId) return r;
              const completedAt = actionsStatus.status === 'completed' ? new Date().toISOString() : r.completedAt;
              return { ...r, actionsStatus, completedAt };
            }),
          };
        });
        saveToStorage(next);
        return next;
      });
    },
    [],
  );

  const startPolling = useCallback(
    (batchId: string, itemId: string, repoUrl: string) => {
      const key = `${batchId}:${itemId}`;
      if (registry.current.has(key)) return;

      const ghParsed = parseGitHubRepo(repoUrl);
      if (!ghParsed) return;
      const { owner, repo } = ghParsed;

      const ctrl = new AbortController();
      registry.current.set(key, ctrl);
      const { signal } = ctrl;
      const cleanup = () => registry.current.delete(key);

      async function fetchStepsAndUpdate(runId: number): Promise<ActionsStep[]> {
        try {
          const jobsRes = await fetch(`/github-api/repos/${owner}/${repo}/actions/runs/${runId}/jobs`);
          if (!jobsRes.ok) return [];
          const { jobs } = await jobsRes.json() as {
            jobs: Array<{ name: string; status: string; conclusion: string | null; steps?: Array<{ name: string; status: string; conclusion: string | null }> }>;
          };
          const mainJob = jobs[0];
          if (!mainJob?.steps) return [];
          const userSteps = mainJob.steps.filter(isUserStep);
          return userSteps.length > 0
            ? userSteps.map(s => ({ name: s.name, status: mapStepStatus(s) }))
            : [{ name: 'GitHub Actions', status: mapStepStatus(mainJob) }];
        } catch {
          return [];
        }
      }

      async function poll() {
        // ── Phase 1: aguarda o run aparecer na API ────────────────────────────
        // Backoff exponencial: começa em 3s, dobra a cada tentativa, teto de 20s.
        // Timeout total de ~2 min (12 tentativas).
        let runId: number | null = null;
        let runUrl = '';

        for (let attempt = 0; attempt < 12; attempt++) {
          const delay = Math.min(3000 * 2 ** attempt, 20000);
          if (signal.aborted) return;
          await sleep(delay);
          if (signal.aborted) return;
          try {
            const res = await fetch(`/github-api/repos/${owner}/${repo}/actions/runs?per_page=1`, { headers: { 'Cache-Control': 'no-cache' } });
            if (!res.ok) continue;
            const data = await res.json() as {
              workflow_runs: Array<{ id: number; html_url: string; status: string; conclusion: string | null }>;
            };
            if (!data.workflow_runs?.length) continue;

            const run = data.workflow_runs[0];
            runId  = run.id;
            runUrl = run.html_url;
            const status = run.status as ActionsStatus['status'];
            const conclusion = run.conclusion as ActionsStatus['conclusion'];

            if (run.status === 'completed') {
              const steps = await fetchStepsAndUpdate(runId);
              updateItemActionsStatus(batchId, itemId, { runId, runUrl, status, conclusion, steps });
              cleanup(); return;
            }

            updateItemActionsStatus(batchId, itemId, { runId, runUrl, status, conclusion });
            break;
          } catch { /* keep polling */ }
        }

        if (!runId) {
          updateItemActionsStatus(batchId, itemId, { status: 'completed', conclusion: null });
          cleanup(); return;
        }

        // ── Phase 2: checa imediatamente ao entrar, depois dorme entre rounds ─
        const noCache = { headers: { 'Cache-Control': 'no-cache' } };
        while (!signal.aborted) {
          try {
            const [runRes, jobsRes] = await Promise.all([
              fetch(`/github-api/repos/${owner}/${repo}/actions/runs/${runId}`, noCache),
              fetch(`/github-api/repos/${owner}/${repo}/actions/runs/${runId}/jobs`, noCache),
            ]);

            if (!runRes.ok) { await sleep(3000); continue; }

            const run = await runRes.json() as { status: string; conclusion: string | null; html_url: string };

            let steps: ActionsStep[] = [];
            if (jobsRes.ok) {
              const { jobs } = await jobsRes.json() as {
                jobs: Array<{ name: string; status: string; conclusion: string | null; steps?: Array<{ name: string; status: string; conclusion: string | null }> }>;
              };
              const mainJob = jobs?.[0];
              if (mainJob?.steps) {
                const userSteps = mainJob.steps.filter(isUserStep);
                steps = userSteps.length > 0
                  ? userSteps.map(s => ({ name: s.name, status: mapStepStatus(s) }))
                  : [{ name: 'GitHub Actions', status: mapStepStatus(mainJob) }];
              }
            }

            updateItemActionsStatus(batchId, itemId, {
              runId,
              runUrl: run.html_url || runUrl,
              status: run.status as ActionsStatus['status'],
              conclusion: run.conclusion as ActionsStatus['conclusion'],
              steps,
            });

            if (run.status === 'completed') { cleanup(); return; }
          } catch { /* keep polling */ }

          await sleep(2000);
        }
      }

      poll().catch(cleanup);
    },
    [updateItemActionsStatus],
  );

  // Resume polling on mount for any in-flight items
  useEffect(() => {
    const loaded = loadFromStorage();
    for (const batch of loaded) {
      for (const result of batch.results) {
        const repoUrl = result.response.requestId;
        if (!repoUrl?.includes('github.com')) continue;
        if (result.actionsStatus?.status === 'completed') continue;
        startPolling(batch.batchId, result.itemId, repoUrl);
      }
    }
    return () => {
      for (const ctrl of registry.current.values()) ctrl.abort();
      registry.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addBatch = useCallback(
    (batch: DeploymentBatch) => {
      const now = new Date().toISOString();
      // Items without a GitHub URL complete immediately — stamp completedAt now
      const enriched: DeploymentBatch = {
        ...batch,
        results: batch.results.map(r => ({
          ...r,
          completedAt: r.response.requestId?.includes('github.com') ? undefined : now,
        })),
      };
      setBatches(prev => {
        const next = [enriched, ...prev];
        saveToStorage(next);
        return next;
      });
      // Start polling for items with GitHub repos
      for (const result of enriched.results) {
        const repoUrl = result.response.requestId;
        if (repoUrl?.includes('github.com')) {
          startPolling(batch.batchId, result.itemId, repoUrl);
        }
      }
    },
    [startPolling],
  );

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
