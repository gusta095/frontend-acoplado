import { useEffect, useRef, useState } from 'react';
import { Box, Button, Link, Paper, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ReceiptLong as ReceiptIcon,
  GitHub as GitHubIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { useDeploymentHistory } from '../../../../context/DeploymentHistoryContext';
import { useTemplateSource } from '../../../../context/TemplateSourceContext';
import { CLOUD_PROVIDERS } from '../../../../api/cloudProviders';
import type { CartItem, ProviderId } from '../../../../types';

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

type SubStepStatus = 'pending' | 'running' | 'success' | 'failed';
type ItemStatus    = 'pending' | 'running' | 'success' | 'failed';

interface SubStep {
  label: string;
  status: SubStepStatus;
  isPlaceholder?: boolean;
}

interface StepState {
  item: CartItem;
  status: ItemStatus;
  message?: string;
  duration?: number;
  repoUrl?: string;
  subSteps: SubStep[];
}

interface LocationState {
  items: CartItem[];
  destination: Record<string, string>;
}

interface GitHubStep {
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | null;
  number: number;
}

interface GitHubJob {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
  steps?: GitHubStep[];
}

interface GitHubRun {
  id: number;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProvider(id: ProviderId) {
  return CLOUD_PROVIDERS.find(p => p.id === id);
}

function extractGitHubUrl(message?: string): string | null {
  if (!message) return null;
  const m = message.match(/https:\/\/github\.com\/[^\s]+/);
  return m?.[0] ?? null;
}

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

// System-added steps that GitHub injects into every job — we hide these
const SYSTEM_STEPS = new Set(['Set up job', 'Complete job']);
function isUserStep(s: GitHubStep) {
  return !SYSTEM_STEPS.has(s.name) && !s.name.startsWith('Post ');
}

function mapStepStatus(s: GitHubStep): SubStepStatus {
  if (s.status === 'in_progress') return 'running';
  if (s.status === 'completed') {
    return (s.conclusion === 'success' || s.conclusion === 'skipped') ? 'success' : 'failed';
  }
  return 'pending';
}

function parseGitHubRepo(url: string): { owner: string; repo: string } | null {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  return m ? { owner: m[1], repo: m[2] } : null;
}

// ─── Spinner ─────────────────────────────────────────────────────────────────

function Spinner({ size = 18, color = '#4F46E5' }: { size?: number; color?: string }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${color}33`,
      borderTopColor: color,
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

// ─── SubStepRow ──────────────────────────────────────────────────────────────

function SubStepRow({ sub, isLast }: { sub: SubStep; isLast: boolean }) {
  const isSuccess = sub.status === 'success';
  const isFailed  = sub.status === 'failed';
  const isRunning = sub.status === 'running';
  const isPending = sub.status === 'pending';

  return (
    <Box display="flex" gap={0}>
      <Box display="flex" flexDirection="column" alignItems="center" width={32} flexShrink={0}>
        <Box sx={{ pt: '9px', zIndex: 1 }}>
          {isRunning  && <Spinner size={18} />}
          {isSuccess  && <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981' }} />}
          {isFailed   && <ErrorIcon sx={{ fontSize: 18, color: '#EF4444' }} />}
          {isPending  && <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
        </Box>
        {!isLast && (
          <Box sx={{ flex: 1, width: 2, bgcolor: '#E2E8F0', position: 'relative', mt: '3px', mb: '2px', minHeight: 20 }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, width: '100%', borderRadius: 1,
              bgcolor: '#10B981',
              height: (isSuccess || isFailed) ? '100%' : '0%',
              transition: 'height 0.4s ease',
            }} />
          </Box>
        )}
      </Box>

      <Box sx={{ pt: '9px', pb: isLast ? 0 : '6px', pl: 1 }}>
        <Typography
          variant="body2"
          fontWeight={isRunning ? 600 : 400}
          color={
            isRunning ? '#4F46E5' :
            isFailed  ? '#EF4444' :
            isPending ? (sub.isPlaceholder ? 'text.disabled' : 'text.secondary') :
            'text.primary'
          }
          sx={{ lineHeight: 1.4, fontSize: '0.82rem', fontStyle: sub.isPlaceholder && isPending ? 'italic' : 'normal' }}
        >
          {sub.label}
        </Typography>
      </Box>
    </Box>
  );
}

// ─── ItemCard ────────────────────────────────────────────────────────────────

function ItemCard({ step }: { step: StepState }) {
  const provider  = getProvider(step.item.offer.providerId);
  const isSuccess = step.status === 'success';
  const isFailed  = step.status === 'failed';
  const isRunning = step.status === 'running';
  const isDone    = isSuccess || isFailed;
  const labelMap  = Object.fromEntries(step.item.offer.parameters.map(p => [p.key, p.label]));
  const visibleParams = Object.entries(step.item.parameters).filter(([, v]) => v !== '' && v != null);

  // Pipeline card status derives from sub-steps (not just item.status)
  const anyRunning = step.subSteps.some(s => s.status === 'running');
  const anyFailed  = step.subSteps.some(s => s.status === 'failed');
  const allDone    = step.subSteps.length > 0 && step.subSteps.every(s => s.status === 'success' || s.status === 'failed');
  const pipelineGreen = allDone && !anyFailed;
  const pipelineRed   = isFailed || (allDone && anyFailed);
  const activeSubStep = step.subSteps.find(s => s.status === 'running');

  return (
    <Box sx={{ animation: 'fadeUp 0.3s ease both' }}>
      {/* Pipeline card */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2,
          borderColor: pipelineGreen ? '#A7F3D0' : pipelineRed ? '#FEB2B2' : '#E2ECF6',
          bgcolor: pipelineGreen ? '#F0FFF4' : pipelineRed ? '#FFF5F5' : '#fff',
          overflow: 'hidden',
          transition: 'border-color 0.4s, background-color 0.4s',
        }}
      >
        {/* Card header */}
        <Box
          display="flex" alignItems="center" justifyContent="space-between" gap={1}
          sx={{
            px: 2.5, py: 1.5,
            borderBottom: `1px solid ${pipelineGreen ? '#D1FAE5' : pipelineRed ? '#FED7D7' : '#F1F5F9'}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {anyRunning && <Spinner size={18} />}
            {pipelineGreen && !anyRunning && <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981' }} />}
            {pipelineRed   && !anyRunning && <ErrorIcon sx={{ fontSize: 18, color: '#EF4444' }} />}
            {!anyRunning && !pipelineGreen && !pipelineRed && step.status === 'pending' && (
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #CBD5E1' }} />
            )}

            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="body2" fontWeight={600}
                color={
                  pipelineGreen ? '#065F46' :
                  pipelineRed   ? '#C53030' :
                  anyRunning    ? '#1E3A8A' :
                  'text.secondary'
                }
              >
                {anyRunning
                  ? (activeSubStep?.label ?? 'Processando') + '...'
                  : pipelineGreen
                    ? `${step.item.offer.name} provisionado com sucesso`
                    : pipelineRed && isFailed && !step.repoUrl
                      ? `${step.item.offer.name} — falhou ao criar repositório`
                      : pipelineRed
                        ? `${step.item.offer.name} — pipeline falhou`
                        : step.item.offer.name
                }
              </Typography>
            </Box>
          </Box>

          {/* Duração do push */}
          {step.duration != null && (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              bgcolor: pipelineGreen ? '#D1FAE5' : pipelineRed ? '#FED7D7' : '#F1F5F9',
              borderRadius: 1.5, px: 1, py: 0.25, flexShrink: 0,
            }}>
              <Typography variant="caption" fontWeight={700} color="text.primary" sx={{ fontFamily: 'monospace' }}>
                {formatDuration(step.duration)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Pipeline steps */}
        <Box px={2.5} pt={1.5} pb={1.75}>
          <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={1.25} letterSpacing="0.06em">
            PIPELINE
          </Typography>
          {step.subSteps.map((sub, i) => (
            <SubStepRow key={`${sub.label}-${i}`} sub={sub} isLast={i === step.subSteps.length - 1} />
          ))}
        </Box>

        {/* Error message (provision failed) */}
        {isFailed && step.message && !step.repoUrl && (
          <Box sx={{ px: 2.5, pb: 1.75, pt: 0 }}>
            <Box sx={{ bgcolor: '#FFF0F0', border: '1px solid #FED7D7', borderRadius: 1.5, px: 1.5, py: 1 }}>
              <Typography variant="caption" color="#C53030">{step.message}</Typography>
            </Box>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProvisioningProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { removeItem } = useCart();
  const { addBatch } = useDeploymentHistory();
  const { cloudClient } = useTemplateSource();

  const state = location.state as LocationState | null;
  const items = state?.items ?? [];
  const destination = state?.destination ?? {};

  const [steps, setSteps] = useState<StepState[]>(() =>
    items.map(item => ({
      item,
      status: 'pending' as ItemStatus,
      subSteps: [{ label: 'Criando repositório', status: 'pending' as SubStepStatus }],
    }))
  );
  const [done, setDone]              = useState(false);
  const [currentBatchId, setBatchId] = useState('');
  const [firstRepoUrl, setFirstRepoUrl] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!state || items.length === 0) { navigate('/cloud-marketplace'); return; }
    if (started.current) return;
    started.current = true;

    // ── Helpers for state mutations ─────────────────────────────────────────

    const patchStep = (idx: number, patch: Partial<StepState>) =>
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

    const setSubSteps = (idx: number, subSteps: SubStep[]) =>
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, subSteps } : s));

    // Placeholder genérico enquanto aguarda o Actions iniciar
    const waitingPlaceholder = (): SubStep[] =>
      [{ label: 'Aguardando GitHub Actions...', status: 'pending', isPlaceholder: true }];

    // ── Poll GitHub Actions for one item ─────────────────────────────────────

    const pollActionsForItem = async (owner: string, repo: string, itemIdx: number): Promise<void> => {
      // Wait for a run to appear (up to ~2 min, polling every 5s)
      let runId: number | null = null;
      for (let attempt = 0; attempt < 24; attempt++) {
        await new Promise(r => setTimeout(r, 5000));
        try {
          const res = await fetch(`/github-api/repos/${owner}/${repo}/actions/runs?per_page=1`);
          if (!res.ok) continue;
          const data = await res.json() as { workflow_runs: GitHubRun[] };
          if (data.workflow_runs?.length) { runId = data.workflow_runs[0].id; break; }
        } catch { /* keep polling */ }
      }

      if (!runId) {
        // Timeout: repo was created, Actions didn't start within the window
        patchStep(itemIdx, { status: 'success' });
        return;
      }

      // ── Poll job steps until run completes ──────────────────────────────────

      while (true) {
        try {
          const [runRes, jobsRes] = await Promise.all([
            fetch(`/github-api/repos/${owner}/${repo}/actions/runs/${runId}`),
            fetch(`/github-api/repos/${owner}/${repo}/actions/runs/${runId}/jobs`),
          ]);

          const run = await runRes.json() as GitHubRun;
          const { jobs } = await jobsRes.json() as { jobs: GitHubJob[] };

          // Show steps from the first job (the main execution job)
          const mainJob = jobs[0];
          if (mainJob?.steps) {
            const userSteps = mainJob.steps.filter(isUserStep);
            setSubSteps(itemIdx, [
              { label: 'Criando repositório', status: 'success' },
              ...userSteps.map(s => ({ label: s.name, status: mapStepStatus(s) })),
            ]);
          } else if (mainJob) {
            // Job found but steps not available yet — show job-level status
            setSubSteps(itemIdx, [
              { label: 'Criando repositório', status: 'success' },
              { label: mainJob.name, status: mapStepStatus({ ...mainJob, number: 1, conclusion: mainJob.conclusion as GitHubStep['conclusion'] }) },
            ]);
          }

          if (run.status === 'completed') {
            patchStep(itemIdx, { status: run.conclusion === 'success' ? 'success' : 'failed' });
            break;
          }
        } catch { /* keep polling */ }

        await new Promise(r => setTimeout(r, 5000));
      }
    };

    // ── Main execution ────────────────────────────────────────────────────────

    const run = async () => {
      const batchId   = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const responses: { requestId: string; status: 'accepted' | 'failed'; message: string; timestamp: string }[] = [];
      const pollingTasks: Promise<void>[] = [];
      let captured: string | null = null;

      // Phase 1: create repos sequentially
      for (let i = 0; i < items.length; i++) {
        patchStep(i, {
          status: 'running',
          subSteps: [{ label: 'Criando repositório', status: 'running' }],
        });

        const start = Date.now();
        let response: typeof responses[number];
        try {
          response = await cloudClient.provision({
            offerId:    items[i].offer.id,
            providerId: items[i].offer.providerId,
            parameters: { ...items[i].parameters, ...destination },
          });
        } catch {
          response = { requestId: '', status: 'failed', message: 'Erro inesperado', timestamp: new Date().toISOString() };
        }

        const duration = Date.now() - start;
        responses.push(response);

        if (response.status === 'failed') {
          patchStep(i, {
            status: 'failed',
            message: response.message,
            duration,
            subSteps: [{ label: 'Criando repositório', status: 'failed' }],
          });
          continue;
        }

        // Repo created — set up placeholder steps and start Actions polling
        const repoUrl = extractGitHubUrl(response.message) ?? undefined;
        if (!captured && repoUrl) { captured = repoUrl; setFirstRepoUrl(repoUrl); }

        patchStep(i, {
          status: 'running', // stays running until Actions completes
          duration,
          repoUrl,
          subSteps: [
            { label: 'Criando repositório', status: 'success' },
            ...waitingPlaceholder(),
          ],
        });

        removeItem(items[i].id);

        // Start Actions polling in parallel (non-blocking for phase 1 loop)
        if (repoUrl) {
          const gh = parseGitHubRepo(repoUrl);
          if (gh) {
            const idx = i; // capture loop var
            pollingTasks.push(pollActionsForItem(gh.owner, gh.repo, idx));
          }
        } else {
          // No GitHub URL — mark done immediately (mock/other)
          patchStep(i, { status: 'success' });
        }
      }

      // Save batch after repos are created (Actions will be tracked live on DeploymentPage)
      addBatch({
        batchId, timestamp,
        snapshot: items.map(item => ({ ...item, parameters: { ...item.parameters, ...destination } })),
        results: items.map((item, i) => ({ itemId: item.id, response: responses[i] })),
      });
      setBatchId(batchId);

      // Phase 2: wait for all Actions pipelines to complete
      await Promise.allSettled(pollingTasks);

      setDone(true);
    };

    run();
  }, []);

  const successCount = steps.filter(s => s.status === 'success').length;
  const failCount    = steps.filter(s => s.status === 'failed').length;
  const allOk        = done && failCount === 0;
  const activeStep   = steps.find(s => s.status === 'running');
  const activeSubStep = activeStep?.subSteps.find(s => s.status === 'running');

  return (
    <>
      <style>{css}</style>
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 6 }, py: 5 }}>
        <Box maxWidth={700} mx="auto">

          {/* Page title */}
          <Box display="flex" alignItems="center" gap={1.5} mb={3} sx={{ animation: 'fadeUp 0.25s ease both' }}>
            {!done && activeStep && <Spinner color="#4F46E5" />}
            {allOk && <CheckCircleIcon sx={{ color: '#10B981', fontSize: 22 }} />}
            {done && !allOk && <ErrorIcon sx={{ color: '#F59E0B', fontSize: 22 }} />}
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.1}>
                {!done
                  ? (activeSubStep?.label ?? (activeStep ? 'Criando repositório' : 'Iniciando'))  + '...'
                  : allOk
                    ? `${successCount === 1 ? 'Pipeline concluído' : 'Pipelines concluídos'} com sucesso`
                    : 'Provisionamento finalizado'
                }
              </Typography>
              {done && (
                <Typography variant="body2" color="text.secondary" mt={0.25}>
                  {allOk
                    ? `${successCount === 1 ? 'Recurso provisionado' : `${successCount} recursos provisionados`} via GitHub Actions`
                    : `${successCount} de ${items.length} ${items.length === 1 ? 'pipeline concluído' : 'pipelines concluídos'}`
                  }
                </Typography>
              )}
            </Box>
          </Box>

          {/* Item cards */}
          <Box display="flex" flexDirection="column" gap={2} mb={done ? 3 : 0}>
            {steps.map(step => (
              <ItemCard key={step.item.id} step={step} />
            ))}
          </Box>

          {/* Result banner */}
          {done && (
            <Box sx={{ animation: 'fadeUp 0.4s ease both' }}>
              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3, px: 3, py: 2.5, mb: 2.5,
                  borderColor: allOk ? '#A7F3D0' : '#FDE68A',
                  bgcolor: allOk ? '#F0FFF4' : '#FFFBEB',
                }}
              >
                <Box display="flex" alignItems="flex-start" gap={1.5}>
                  {allOk
                    ? <CheckCircleIcon sx={{ fontSize: 22, color: '#10B981', mt: '1px', flexShrink: 0 }} />
                    : <ErrorIcon sx={{ fontSize: 22, color: '#F59E0B', mt: '1px', flexShrink: 0 }} />
                  }
                  <Box>
                    <Typography variant="subtitle1" fontWeight={700} color={allOk ? '#065F46' : '#92400E'}>
                      {allOk
                        ? `${successCount === 1 ? 'Recurso provisionado com sucesso!' : `${successCount} recursos provisionados com sucesso!`}`
                        : `${successCount} de ${items.length} ${items.length === 1 ? 'recurso provisionado' : 'recursos provisionados'}`
                      }
                    </Typography>
                    <Typography variant="body2" color={allOk ? '#047857' : '#92400E'} mt={0.25}>
                      {allOk
                        ? `${steps.filter(s => s.status === 'success').map(s => s.item.offer.name).join(', ')} ${successCount === 1 ? 'provisionado' : 'provisionados'} com sucesso via GitHub Actions.`
                        : `${failCount} ${failCount === 1 ? 'pipeline falhou' : 'pipelines falharam'} — verifique os detalhes acima.`
                      }
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* CTAs */}
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate(`/deployments/${currentBatchId}`)}
                  sx={{ borderRadius: 2, fontWeight: 600, px: 3, borderColor: '#E2E8F0', color: 'text.secondary' }}
                >
                  Ver detalhes da implantação
                </Button>
              </Box>
            </Box>
          )}

        </Box>
      </Box>
    </>
  );
}
