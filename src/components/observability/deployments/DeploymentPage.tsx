import { useEffect, useState } from 'react';
import {
  Box, Button, Chip, Collapse, Dialog, DialogContent, DialogTitle, Divider,
  IconButton, Link, Paper, Tooltip, Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  ExpandMore as ExpandMoreIcon,
  RocketLaunch as RocketLaunchIcon,
  DataObject as PayloadIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  GitHub as GitHubIcon,
  OpenInNew as OpenInNewIcon,
  Warning as PartialIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeploymentHistory } from '../../../context/DeploymentHistoryContext';
import type { ActionsStatus, DeploymentBatch } from '../../../context/DeploymentHistoryContext';
import { ProviderBadge } from '../../infrastructure/shared/ProviderBadge';
import type { CartItem } from '../../../types';

const css = `
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startTime);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startTime), 200);
    return () => clearInterval(id);
  }, [startTime]);
  return <>{formatDuration(elapsed)}</>;
}

function buildItemPayload(item: CartItem) {
  return {
    template: `${item.offer.providerId}/${item.offer.id}`,
    payload: item.parameters,
  };
}

type ItemLiveStatus = 'in_flight' | 'success' | 'failed' | 'repo_failed';

function getItemLiveStatus(
  responseStatus: 'accepted' | 'failed',
  actionsStatus?: ActionsStatus,
  requestId?: string,
): ItemLiveStatus {
  if (responseStatus === 'failed') return 'repo_failed';
  if (!requestId?.includes('github.com')) return 'success';
  if (!actionsStatus || actionsStatus.status !== 'completed') return 'in_flight';
  return actionsStatus.conclusion === 'success' ? 'success' : 'failed';
}

// ─── Payload dialog ───────────────────────────────────────────────────────────

function PayloadDialog({ item, open, onClose }: { item: CartItem | null; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = item ? JSON.stringify(buildItemPayload(item), null, 2) : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PayloadIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Box>
            <Typography fontWeight={700}>Payload — {item?.offer.name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {item?.offer.providerId.toUpperCase()}
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={0.5}>
          <Tooltip title={copied ? 'Copiado!' : 'Copiar JSON'}>
            <IconButton size="small" onClick={handleCopy}>
              <CopyIcon fontSize="small" sx={{ color: copied ? '#10B981' : 'text.secondary' }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: '#0F172A', color: '#E2E8F0', borderRadius: 2,
            p: 2.5, fontSize: '0.8rem', fontFamily: 'monospace',
            overflowX: 'auto', lineHeight: 1.7, m: 0, maxHeight: '60vh', overflowY: 'auto',
          }}
        >
          {json}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Pipeline panel (left column) ────────────────────────────────────────────

function Spinner({ size = 16 }: { size?: number }) {
  return (
    <Box sx={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2px solid #3B82F633`,
      borderTopColor: '#3B82F6',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
}

function StepRow({ step, isLast }: { step: { name: string; status: 'pending' | 'running' | 'success' | 'failed' }; isLast: boolean }) {
  const isRunning = step.status === 'running';
  const isDone    = step.status === 'success' || step.status === 'failed';
  return (
    <Box display="flex" gap={0} alignItems="stretch">
      <Box display="flex" flexDirection="column" alignItems="center" width={28} flexShrink={0}>
        <Box sx={{ pt: '8px', zIndex: 1 }}>
          {isRunning && <Spinner size={14} />}
          {step.status === 'success' && <CheckCircleIcon sx={{ fontSize: 14, color: '#10B981' }} />}
          {step.status === 'failed'  && <ErrorIcon sx={{ fontSize: 14, color: '#EF4444' }} />}
          {step.status === 'pending' && <Box sx={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid #CBD5E1' }} />}
        </Box>
        {!isLast && (
          <Box sx={{ flex: 1, width: 2, bgcolor: '#E2E8F0', mx: 'auto', mt: '2px', mb: '1px', minHeight: 16 }}>
            {isDone && <Box sx={{ width: '100%', height: '100%', bgcolor: step.status === 'success' ? '#10B981' : '#EF4444', borderRadius: 1 }} />}
          </Box>
        )}
      </Box>
      <Box sx={{ pt: '7px', pb: isLast ? 0 : '4px', pl: 0.75 }}>
        <Typography
          variant="caption"
          fontWeight={isRunning ? 700 : 400}
          color={isRunning ? '#2563EB' : step.status === 'failed' ? '#EF4444' : step.status === 'pending' ? 'text.disabled' : 'text.primary'}
          sx={{ fontSize: '0.78rem', lineHeight: 1.4 }}
        >
          {step.name}
        </Typography>
      </Box>
    </Box>
  );
}

// Renderiza apenas os steps da pipeline
function PipelinePanel({ result }: { result: DeploymentBatch['results'][0] }) {
  const { actionsStatus, response } = result;
  const liveStatus = getItemLiveStatus(response.status, actionsStatus, response.requestId);

  if (response.status === 'failed') {
    return (
      <Box sx={{ bgcolor: '#FFF5F5', borderRadius: 2, p: 2, border: '1px solid #FECACA' }}>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <ErrorIcon sx={{ fontSize: 16, color: '#EF4444' }} />
          <Typography variant="caption" fontWeight={700} color="#C53030" textTransform="uppercase" letterSpacing="0.06em">
            Falha
          </Typography>
        </Box>
        <Typography variant="body2" color="#C53030" fontSize="0.8rem">
          {response.message || 'Erro ao criar repositório'}
        </Typography>
      </Box>
    );
  }

  if (!actionsStatus) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={1}>
        <Spinner />
        <Typography variant="caption" color="#2563EB" fontStyle="italic">
          Aguardando GitHub Actions...
        </Typography>
      </Box>
    );
  }

  const steps = actionsStatus.steps ?? [];

  if (steps.length === 0) {
    return (
      <Box display="flex" alignItems="center" gap={1} py={0.5}>
        {liveStatus === 'in_flight' && <Spinner />}
        <Typography variant="caption" color={liveStatus === 'in_flight' ? '#2563EB' : 'text.secondary'} fontStyle="italic" fontSize="0.78rem">
          {liveStatus === 'in_flight' ? 'Carregando steps da pipeline...' : 'Nenhum step disponível'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box display="flex" flexDirection="column" gap={0}>
      {steps.map((step, i) => (
        <StepRow key={`${step.name}-${i}`} step={step} isLast={i === steps.length - 1} />
      ))}
    </Box>
  );
}

// Resumo do lado direito: repo + status da pipeline
function PipelineSummary({ result, repoUrl, onOpenPayload }: {
  result: DeploymentBatch['results'][0];
  repoUrl?: string;
  onOpenPayload?: () => void;
}) {
  const { actionsStatus, response } = result;
  const liveStatus = getItemLiveStatus(response.status, actionsStatus, response.requestId);

  return (
    <Box display="flex" flexDirection="column" gap={1.5}>
      {/* Repo link */}
      {repoUrl && (
        <Box display="flex" alignItems="center" gap={0.75}
          sx={{ py: 1, px: 1.5, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2ECF6' }}
        >
          <GitHubIcon sx={{ color: 'text.disabled', fontSize: 15, flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary" fontFamily="monospace" flex={1} noWrap>
            {repoUrl.replace('https://github.com/', '')}
          </Typography>
          <Link
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'primary.main', fontSize: '0.7rem', textDecoration: 'none', flexShrink: 0 }}
          >
            Abrir <OpenInNewIcon sx={{ fontSize: 10 }} />
          </Link>
        </Box>
      )}

      {/* Pipeline status */}
      {actionsStatus && (
        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}
          sx={{ py: 1, px: 1.5, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2ECF6' }}
        >
          <Box display="flex" alignItems="center" gap={1}>
            {liveStatus === 'in_flight'
              ? <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
              : liveStatus === 'success'
                ? <CheckCircleIcon sx={{ fontSize: 15, color: '#10B981' }} />
                : <ErrorIcon sx={{ fontSize: 15, color: '#EF4444' }} />
            }
            <Typography variant="caption" fontWeight={700} color={
              liveStatus === 'in_flight' ? '#2563EB' :
              liveStatus === 'success'   ? '#065F46' : '#C53030'
            }>
              {liveStatus === 'in_flight'
                ? (actionsStatus.status === 'queued' ? 'Aguardando na fila' : 'Em execução')
                : liveStatus === 'success' ? 'Pipeline concluída com sucesso'
                : 'Pipeline falhou'
              }
            </Typography>
          </Box>
          {actionsStatus.runUrl && (
            <Link
              href={actionsStatus.runUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              sx={{ display: 'flex', alignItems: 'center', gap: 0.25, color: 'primary.main', fontSize: '0.7rem', textDecoration: 'none', flexShrink: 0 }}
            >
              Ver execução <OpenInNewIcon sx={{ fontSize: 10 }} />
            </Link>
          )}
        </Box>
      )}

      {/* Ver payload */}
      {onOpenPayload && (
        <Box
          display="flex" alignItems="center" gap={0.75}
          onClick={e => { e.stopPropagation(); onOpenPayload(); }}
          sx={{ py: 1, px: 1.5, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2ECF6', cursor: 'pointer', '&:hover': { bgcolor: '#F1F5F9' } }}
        >
          <PayloadIcon sx={{ fontSize: 15, color: 'text.disabled', flexShrink: 0 }} />
          <Typography variant="caption" color="text.secondary">
            Ver payload
          </Typography>
        </Box>
      )}
    </Box>
  );
}

// ─── Resource card ────────────────────────────────────────────────────────────

function ResourceCard({
  item, result, onOpenPayload, batchTimestamp,
}: {
  item: CartItem;
  result: DeploymentBatch['results'][0];
  onOpenPayload?: () => void;
  batchTimestamp: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const liveStatus = getItemLiveStatus(result.response.status, result.actionsStatus, result.response.requestId);
  const repoUrl = result.response.requestId?.includes('github.com') ? result.response.requestId : undefined;

  const itemStartMs = result.startedAt
    ? new Date(result.startedAt).getTime()
    : new Date(batchTimestamp).getTime();
  const itemDuration = result.completedAt
    ? new Date(result.completedAt).getTime() - itemStartMs
    : null;

  const borderColor =
    liveStatus === 'in_flight' ? '#BFDBFE' :
    liveStatus === 'success'   ? '#A7F3D0' : '#FECACA';

  const headBg =
    liveStatus === 'in_flight' ? '#EFF6FF' :
    liveStatus === 'success'   ? '#F0FFF4' : '#FFF5F5';

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2.5, borderColor, overflow: 'hidden' }}
    >
      {/* Card header — clicável para colapsar */}
      <Box
        display="flex" alignItems="center" gap={1.5}
        onClick={() => setExpanded(v => !v)}
        sx={{
          px: 2.5, py: 1.5, bgcolor: headBg,
          borderBottom: expanded ? `1px solid ${borderColor}` : 'none',
          cursor: 'pointer', userSelect: 'none',
          '&:hover': { filter: 'brightness(0.97)' },
        }}
      >
        {liveStatus === 'in_flight'
          ? <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#3B82F6', animation: 'pulse-dot 1.2s ease-in-out infinite', flexShrink: 0 }} />
          : liveStatus === 'success'
            ? <CheckCircleIcon sx={{ fontSize: 18, color: '#10B981', flexShrink: 0 }} />
            : <ErrorIcon sx={{ fontSize: 18, color: '#EF4444', flexShrink: 0 }} />
        }
        <Typography variant="body2" fontWeight={700} color="text.primary" flex={1}>
          {item.offer.name}
        </Typography>
        <ProviderBadge provider={item.offer.providerId} />

        {/* Timer por item */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'center',
          bgcolor: liveStatus === 'success' ? '#D1FAE5' : liveStatus === 'in_flight' ? '#DBEAFE' : '#FEE2E2',
          borderRadius: 1.5, px: 1, py: 0.2, flexShrink: 0,
        }}>
          <Typography variant="caption" fontWeight={700} sx={{ fontFamily: 'monospace', fontSize: '0.75rem',
            color: liveStatus === 'success' ? '#065F46' : liveStatus === 'in_flight' ? '#1D4ED8' : '#C53030',
          }}>
            {itemDuration != null
              ? formatDuration(itemDuration)
              : liveStatus === 'in_flight'
                ? <ElapsedTimer startTime={itemStartMs} />
                : '—'
            }
          </Typography>
        </Box>

        <ExpandMoreIcon sx={{
          fontSize: 18, color: 'text.disabled', flexShrink: 0,
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      {/* Collapsible body */}
      <Collapse in={expanded}>
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={0}>

          {/* Left: Steps */}
          <Box sx={{ p: 2.5, borderRight: { md: `1px solid ${borderColor}` }, borderBottom: { xs: `1px solid ${borderColor}`, md: 'none' } }}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" textTransform="uppercase" letterSpacing="0.06em" display="block" mb={1.5}>
              Pipeline
            </Typography>
            <PipelinePanel result={result} />
          </Box>

          {/* Right: Repo + pipeline status */}
          <Box sx={{ p: 2.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.disabled" textTransform="uppercase" letterSpacing="0.06em" display="block" mb={1.5}>
              Informações
            </Typography>
            <PipelineSummary result={result} repoUrl={repoUrl} onOpenPayload={onOpenPayload} />
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  basePath?: string;
}

export function DeploymentPage({ basePath = '/deployments' }: Props) {
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, getBatch } = useDeploymentHistory();
  const batch = getBatch(batchId ?? '');
  const [payloadItem, setPayloadItem] = useState<CartItem | null>(null);

  if (!batch) {
    return (
      <>
        <style>{css}</style>
        <Box p={6} display="flex" flexDirection="column" alignItems="center" gap={2}>
          <RocketLaunchIcon sx={{ fontSize: 48, color: '#CBD5E0' }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            Implantação não encontrada
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Esta execução pode ter sido removida ou o link é inválido.
          </Typography>
          <Button variant="contained" onClick={() => navigate(basePath)} sx={{ mt: 1 }}>
            Voltar
          </Button>
        </Box>
      </>
    );
  }

  const { timestamp, snapshot, results } = batch;
  const batchIndex    = batches.findIndex(b => b.batchId === batchId);
  const batchNumber   = batches.length - batchIndex;
  const successCount  = results.filter(r => getItemLiveStatus(r.response.status, r.actionsStatus, r.response.requestId) === 'success').length;
  const inFlightCount = results.filter(r => getItemLiveStatus(r.response.status, r.actionsStatus, r.response.requestId) === 'in_flight').length;
  const failCount     = results.length - successCount - inFlightCount;
  const allSuccess    = inFlightCount === 0 && failCount === 0;
  const hasInFlight   = inFlightCount > 0;

  const formattedDate = new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  const startMs = new Date(timestamp).getTime();
  const completedAts = results.map(r => r.completedAt).filter(Boolean) as string[];
  // Duração total: do início até o completedAt mais tardio (apenas quando todos concluídos).
  // null = em andamento (mostra timer vivo) ou sem dados de duração (batch antigo).
  const totalDuration = !hasInFlight && completedAts.length > 0
    ? Math.max(...completedAts.map(d => new Date(d).getTime())) - startMs
    : null;

  return (
    <>
      <style>{css}</style>
      <Box px={{ xs: 3, md: 5 }} py={4} maxWidth={1100} mx="auto">

        {/* Back */}
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(basePath)}
          sx={{ mb: 3, color: 'text.secondary', px: 0, '&:hover': { bgcolor: 'transparent', color: 'text.primary' } }}
          disableRipple
        >
          Histórico de implantações
        </Button>

        {/* Batch header */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={4} flexWrap="wrap">
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
              Execução #{batchNumber}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formattedDate} · {results.length} {results.length === 1 ? 'recurso' : 'recursos'}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={1.5}>
            {/* Contador de duração */}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center',
              bgcolor: '#F1F5F9', borderRadius: 1.5, px: 1.25, py: 0.4,
            }}>
              <Typography variant="body2" fontWeight={700} color="text.primary" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {totalDuration != null
                  ? formatDuration(totalDuration)
                  : hasInFlight
                    ? <ElapsedTimer startTime={startMs} />
                    : '—'
                }
              </Typography>
            </Box>

            {hasInFlight && (
              <Chip
                icon={
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6', animation: 'pulse-dot 1.2s ease-in-out infinite' }} />
                }
                label={`${inFlightCount} em andamento`}
                sx={{ fontWeight: 700, fontSize: '0.8rem', height: 32, bgcolor: '#DBEAFE', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
              />
            )}
            {!hasInFlight && (
              <Chip
                icon={allSuccess
                  ? <CheckCircleIcon sx={{ fontSize: '16px !important' }} />
                  : <PartialIcon sx={{ fontSize: '16px !important' }} />
                }
                label={allSuccess
                  ? `${successCount} ${successCount === 1 ? 'pipeline concluída' : 'pipelines concluídas'}`
                  : `${successCount}/${results.length} concluídos`
                }
                sx={{
                  fontWeight: 700, fontSize: '0.8rem', height: 32,
                  bgcolor: allSuccess ? '#D1FAE5' : '#FEF3C7',
                  color: allSuccess ? '#065F46' : '#92400E',
                  border: `1px solid ${allSuccess ? '#A7F3D0' : '#FDE68A'}`,
                  '& .MuiChip-icon': { color: allSuccess ? '#10B981' : '#F59E0B' },
                }}
              />
            )}
          </Box>
        </Box>

        {/* Divider */}
        <Divider sx={{ mb: 4, borderColor: '#F1F5F9' }} />

        {/* Resource cards */}
        <Box display="flex" flexDirection="column" gap={3} mb={5}>
          {snapshot.map((item, i) => {
            const result = results.find(r => r.itemId === item.id) ?? results[i];
            if (!result) return null;
            return (
              <ResourceCard key={item.id} item={item} result={result} onOpenPayload={() => setPayloadItem(item)} batchTimestamp={timestamp} />
            );
          })}
        </Box>

        {/* Bottom actions */}
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <Button
            variant="outlined"
            onClick={() => navigate(basePath)}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
          >
            Voltar
          </Button>
        </Box>

        <PayloadDialog item={payloadItem} open={payloadItem !== null} onClose={() => setPayloadItem(null)} />
      </Box>
    </>
  );
}
