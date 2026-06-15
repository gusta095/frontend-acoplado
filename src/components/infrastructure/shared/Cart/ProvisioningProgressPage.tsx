import { useEffect, useRef, useState } from 'react';
import { Box, Button, Collapse, Paper, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ReceiptLong as ReceiptIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { useDeploymentHistory } from '../../../../context/DeploymentHistoryContext';
import type { ActionsStatus } from '../../../../context/DeploymentHistoryContext';
import { useTemplateSource } from '../../../../context/TemplateSourceContext';
import type { CartItem } from '../../../../types';

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
  startTime?: number;
  repoUrl?: string;
  subSteps: SubStep[];
}

interface LocationState {
  items: CartItem[];
  definicaoProduto: Record<string, string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// Deriva os subSteps de exibição a partir do actionsStatus do contexto
function deriveSubSteps(actionsStatus: ActionsStatus): SubStep[] {
  const repoStep: SubStep = { label: 'Criando repositório', status: 'success' };

  if (actionsStatus.status === 'pending' || actionsStatus.status === 'queued') {
    return [repoStep, { label: 'Aguardando GitHub Actions', status: 'running', isPlaceholder: true }];
  }

  if (!actionsStatus.steps?.length) {
    const ghStatus: SubStepStatus =
      actionsStatus.status === 'in_progress' ? 'running' :
      actionsStatus.conclusion === 'success'  ? 'success' : 'failed';
    return [repoStep, { label: 'GitHub Actions', status: ghStatus }];
  }

  return [
    repoStep,
    ...actionsStatus.steps.map(s => ({ label: s.name, status: s.status })),
  ];
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

// ─── ElapsedTimer ────────────────────────────────────────────────────────────

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(id);
  }, [startTime]);
  return <>{formatDuration(elapsed)}</>;
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
  const [expanded, setExpanded] = useState(false);
  const isFailed  = step.status === 'failed';

  const anyRunning    = step.subSteps.some(s => s.status === 'running');
  const anyFailed     = step.subSteps.some(s => s.status === 'failed');
  const allDone       = step.subSteps.length > 0 && step.subSteps.every(s => s.status === 'success' || s.status === 'failed');
  const pipelineGreen = allDone && !anyFailed;
  const pipelineRed   = isFailed || (allDone && anyFailed);

  const dividerColor = pipelineGreen ? '#D1FAE5' : pipelineRed ? '#FED7D7' : '#F1F5F9';

  return (
    <Box sx={{ animation: 'fadeUp 0.3s ease both' }}>
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
        {/* Card header — clicável para colapsar */}
        <Box
          display="flex" alignItems="center" justifyContent="space-between" gap={1}
          onClick={() => setExpanded(v => !v)}
          sx={{
            px: 2.5, py: 1.5, cursor: 'pointer', userSelect: 'none',
            borderBottom: expanded ? `1px solid ${dividerColor}` : 'none',
            '&:hover': { filter: 'brightness(0.97)' },
          }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {anyRunning && <Spinner size={18} />}
            {pipelineGreen && !anyRunning && <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981' }} />}
            {pipelineRed   && !anyRunning && <ErrorIcon sx={{ fontSize: 18, color: '#EF4444' }} />}
            {!anyRunning && !pipelineGreen && !pipelineRed && step.status === 'pending' && (
              <Box sx={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #CBD5E1' }} />
            )}
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
                ? `${step.item.offer.name} — provisionamento em andamento`
                : pipelineGreen
                  ? `${step.item.offer.name} provisionado com sucesso`
                  : pipelineRed && isFailed && !step.repoUrl
                    ? `${step.item.offer.name} — falhou ao criar repositório`
                    : pipelineRed
                      ? `${step.item.offer.name} — provisionamento falhou`
                      : step.item.offer.name
              }
            </Typography>
          </Box>

          {/* Contador + seta */}
          <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
            {(step.duration != null || step.startTime != null) && (
              <Box sx={{
                display: 'inline-flex', alignItems: 'center',
                bgcolor: pipelineGreen ? '#D1FAE5' : pipelineRed ? '#FED7D7' : '#F1F5F9',
                borderRadius: 1.5, px: 1, py: 0.25,
              }}>
                <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontFamily: 'monospace' }}>
                  {step.duration != null
                    ? formatDuration(step.duration)
                    : <ElapsedTimer startTime={step.startTime!} />
                  }
                </Typography>
              </Box>
            )}
            <ExpandMoreIcon sx={{
              fontSize: 18, color: 'text.disabled',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </Box>
        </Box>

        {/* Pipeline steps — colapsável */}
        <Collapse in={expanded}>
          <Box px={2.5} pt={1.5} pb={1.75}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" display="block" mb={1.25} letterSpacing="0.06em">
              PIPELINE
            </Typography>
            {step.subSteps.map((sub, i) => (
              <SubStepRow key={`${sub.label}-${i}`} sub={sub} isLast={i === step.subSteps.length - 1} />
            ))}
          </Box>

          {isFailed && step.message && !step.repoUrl && (
            <Box sx={{ px: 2.5, pb: 1.75, pt: 0 }}>
              <Box sx={{ bgcolor: '#FFF0F0', border: '1px solid #FED7D7', borderRadius: 1.5, px: 1.5, py: 1 }}>
                <Typography variant="caption" color="#C53030">{step.message}</Typography>
              </Box>
            </Box>
          )}
        </Collapse>
      </Paper>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProvisioningProgressPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { removeItem } = useCart();
  const { addBatch, getBatch } = useDeploymentHistory();
  const { cloudClient } = useTemplateSource();

  const state = location.state as LocationState | null;
  const items = state?.items ?? [];
  const definicaoProduto = state?.definicaoProduto ?? {};

  const [steps, setSteps] = useState<StepState[]>(() =>
    items.map(item => ({
      item,
      status: 'pending' as ItemStatus,
      subSteps: [{ label: 'Criando repositório', status: 'pending' as SubStepStatus }],
    }))
  );
  const [done, setDone]              = useState(false);
  const [currentBatchId, setBatchId] = useState('');
  const started = useRef(false);

  // Lê o batch do contexto para sincronizar actionsStatus → steps locais
  const contextBatch = currentBatchId ? getBatch(currentBatchId) : null;

  // Sincroniza actionsStatus do contexto para o estado visual local
  useEffect(() => {
    if (!contextBatch) return;
    setSteps(prev => prev.map(s => {
      const ctxResult = contextBatch.results.find(r => r.itemId === s.item.id);
      if (!ctxResult?.actionsStatus) return s;
      if (s.status === 'failed' && !s.repoUrl) return s; // falha na criação do repo — não sobrescreve

      const { actionsStatus } = ctxResult;
      const isDone = actionsStatus.status === 'completed';
      return {
        ...s,
        status: isDone
          ? (actionsStatus.conclusion === 'success' ? 'success' : 'failed')
          : 'running',
        subSteps: deriveSubSteps(actionsStatus),
        ...(isDone && s.startTime != null ? { duration: Date.now() - s.startTime } : {}),
      };
    }));
  }, [contextBatch]);

  // Detecta quando todos os items terminaram (via steps)
  useEffect(() => {
    if (!currentBatchId || steps.length === 0) return;
    if (steps.every(s => s.status === 'success' || s.status === 'failed')) {
      setDone(true);
    }
  }, [steps, currentBatchId]);

  // Phase 1: cria repos sequencialmente; contexto assume o polling após addBatch
  useEffect(() => {
    if (!state || items.length === 0) { navigate('/cloud-marketplace'); return; }
    if (started.current) return;
    started.current = true;

    const patchStep = (idx: number, patch: Partial<StepState>) =>
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));

    const run = async () => {
      const batchId   = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const responses: { requestId: string; status: 'accepted' | 'failed'; message: string; timestamp: string }[] = [];
      const startedAts: string[] = [];

      for (let i = 0; i < items.length; i++) {
        const start = Date.now();
        startedAts.push(new Date(start).toISOString());
        patchStep(i, {
          status: 'running',
          startTime: start,
          subSteps: [{ label: 'Criando repositório', status: 'running' }],
        });

        let response: typeof responses[number];
        try {
          response = await cloudClient.provision({
            offerId:    items[i].offer.id,
            providerId: items[i].offer.providerId,
            parameters: { ...items[i].parameters, ...definicaoProduto },
          });
        } catch {
          response = { requestId: '', status: 'failed', message: 'Erro inesperado', timestamp: new Date().toISOString() };
        }

        responses.push(response);

        if (response.status === 'failed') {
          patchStep(i, {
            status: 'failed',
            message: response.message,
            duration: Date.now() - start,
            subSteps: [{ label: 'Criando repositório', status: 'failed' }],
          });
          continue;
        }

        const repoUrl = extractGitHubUrl(response.message) ?? undefined;

        patchStep(i, {
          status: 'running',
          repoUrl,
          subSteps: [
            { label: 'Criando repositório', status: 'success' },
            { label: 'Aguardando GitHub Actions', status: 'running', isPlaceholder: true },
          ],
        });

        removeItem(items[i].id);

        // Sem repoUrl (mock/outro): marca done imediatamente
        if (!repoUrl) {
          patchStep(i, { status: 'success', duration: Date.now() - start });
        }
      }

      // Registra o batch — contexto inicia o polling automaticamente para cada item com repoUrl
      addBatch({
        batchId, timestamp,
        snapshot: items.map(item => ({ ...item, parameters: { ...item.parameters, ...definicaoProduto } })),
        results: items.map((item, i) => ({ itemId: item.id, response: responses[i], startedAt: startedAts[i] })),
      });
      setBatchId(batchId);
    };

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const successCount  = steps.filter(s => s.status === 'success').length;
  const failCount     = steps.filter(s => s.status === 'failed').length;
  const allOk         = done && failCount === 0;
  const activeStep    = steps.find(s => s.status === 'running');

  return (
    <>
      <style>{css}</style>
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 6 }, py: 5 }}>
        <Box maxWidth={700} mx="auto">

          {/* Título da página */}
          <Box display="flex" alignItems="center" gap={1.5} mb={3} sx={{ animation: 'fadeUp 0.25s ease both' }}>
            {!done && activeStep && <Spinner color="#4F46E5" />}
            {allOk  && <CheckCircleIcon sx={{ color: '#10B981', fontSize: 22 }} />}
            {done && !allOk && <ErrorIcon sx={{ color: '#F59E0B', fontSize: 22 }} />}
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.1}>
                {!done
                  ? (activeStep ? 'Provisionando recursos...' : 'Iniciando...')
                  : allOk
                    ? `${successCount === 1 ? 'Recurso provisionado' : 'Recursos provisionados'} com sucesso`
                    : 'Provisionamento concluído com falhas'
                }
              </Typography>
              {done && (
                <Typography variant="body2" color="text.secondary" mt={0.25}>
                  {allOk
                    ? `${successCount === 1 ? '1 recurso provisionado' : `${successCount} recursos provisionados`} via GitHub Actions`
                    : `${successCount} de ${items.length} ${items.length === 1 ? 'recurso provisionado' : 'recursos provisionados'} com sucesso`
                  }
                </Typography>
              )}
            </Box>
          </Box>

          {/* Cards dos itens */}
          <Box display="flex" flexDirection="column" gap={2} mb={done ? 3 : 0}>
            {steps.map(step => (
              <ItemCard key={step.item.id} step={step} />
            ))}
          </Box>

          {/* Banner de resultado */}
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
