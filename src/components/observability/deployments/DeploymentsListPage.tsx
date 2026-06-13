import { Box, Button, Paper, Typography } from '@mui/material';
import {
  RocketLaunch as RocketLaunchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ChevronRight as ChevronRightIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDeploymentHistory } from '../../../context/DeploymentHistoryContext';
import type { DeploymentBatch, ActionsStatus } from '../../../context/DeploymentHistoryContext';
import { ProviderBadge } from '../../infrastructure/shared/ProviderBadge';

const css = `
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

type BatchLiveStatus = 'in_flight' | 'success' | 'partial' | 'failed';

function getBatchLiveStatus(batch: DeploymentBatch): BatchLiveStatus {
  const statuses = batch.results.map(r =>
    getItemLiveStatus(r.response.status, r.actionsStatus, r.response.requestId)
  );
  if (statuses.some(s => s === 'in_flight')) return 'in_flight';
  if (statuses.every(s => s === 'success')) return 'success';
  if (statuses.some(s => s === 'success')) return 'partial';
  return 'failed';
}

function getActiveStepLabel(actionsStatus?: ActionsStatus): string | null {
  if (!actionsStatus || actionsStatus.status === 'completed') return null;
  if (actionsStatus.status === 'queued') return 'Aguardando na fila';
  if (!actionsStatus.steps?.length) return 'Executando...';
  const running = actionsStatus.steps.find(s => s.status === 'running');
  return running ? running.name : 'Processando';
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: BatchLiveStatus }) {
  if (status === 'in_flight') {
    return (
      <Box display="flex" alignItems="center" gap={0.75}>
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6',
          animation: 'pulse-dot 1.2s ease-in-out infinite',
          flexShrink: 0,
        }} />
        <Typography variant="caption" fontWeight={700} color="#2563EB">
          Em andamento
        </Typography>
      </Box>
    );
  }
  if (status === 'success') {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <CheckCircleIcon sx={{ fontSize: 15, color: '#10B981' }} />
        <Typography variant="caption" fontWeight={700} color="#065F46">Concluído</Typography>
      </Box>
    );
  }
  if (status === 'partial') {
    return (
      <Box display="flex" alignItems="center" gap={0.5}>
        <WarningIcon sx={{ fontSize: 15, color: '#F59E0B' }} />
        <Typography variant="caption" fontWeight={700} color="#92400E">Parcial</Typography>
      </Box>
    );
  }
  return (
    <Box display="flex" alignItems="center" gap={0.5}>
      <ErrorIcon sx={{ fontSize: 15, color: '#EF4444' }} />
      <Typography variant="caption" fontWeight={700} color="#C53030">Falhou</Typography>
    </Box>
  );
}

// ─── Item row inside batch card ───────────────────────────────────────────────

function ItemRow({ result, snapshot }: {
  result: DeploymentBatch['results'][0];
  snapshot: DeploymentBatch['snapshot'][0];
}) {
  const liveStatus = getItemLiveStatus(result.response.status, result.actionsStatus, result.response.requestId);
  const activeStep = liveStatus === 'in_flight' ? getActiveStepLabel(result.actionsStatus) : null;
  const steps = result.actionsStatus?.steps ?? [];
  const doneSteps = steps.filter(s => s.status === 'success').length;
  const totalSteps = steps.length;

  return (
    <Box
      display="flex" alignItems="center" gap={1.5}
      sx={{ py: 0.75, px: 1.25, borderRadius: 1.5, bgcolor: '#F8FAFC', border: '1px solid #E2ECF6' }}
    >
      {/* Status icon */}
      <Box flexShrink={0}>
        {liveStatus === 'in_flight' && (
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%', bgcolor: '#3B82F6',
            animation: 'pulse-dot 1.2s ease-in-out infinite',
          }} />
        )}
        {liveStatus === 'success' && <CheckCircleIcon sx={{ fontSize: 14, color: '#10B981' }} />}
        {(liveStatus === 'failed' || liveStatus === 'repo_failed') && (
          <ErrorIcon sx={{ fontSize: 14, color: '#EF4444' }} />
        )}
      </Box>

      {/* Offer name + provider */}
      <Box flex={1} minWidth={0}>
        <Box display="flex" alignItems="center" gap={0.75}>
          <Typography variant="caption" fontWeight={600} color="text.primary" noWrap>
            {snapshot.offer.name}
          </Typography>
          <ProviderBadge provider={snapshot.offer.providerId} />
        </Box>
        {activeStep && (
          <Typography variant="caption" color="#2563EB" fontSize="0.67rem" fontStyle="italic">
            {activeStep}...
          </Typography>
        )}
        {liveStatus === 'repo_failed' && (
          <Typography variant="caption" color="#EF4444" fontSize="0.67rem">
            Falha ao criar repositório
          </Typography>
        )}
        {liveStatus === 'failed' && !activeStep && (
          <Typography variant="caption" color="#EF4444" fontSize="0.67rem">
            Pipeline falhou
          </Typography>
        )}
      </Box>

      {/* Step progress (when in_flight with steps) */}
      {liveStatus === 'in_flight' && totalSteps > 0 && (
        <Typography variant="caption" color="text.disabled" fontSize="0.65rem" flexShrink={0}>
          {doneSteps}/{totalSteps} steps
        </Typography>
      )}
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  basePath?: string;
}

export function DeploymentsListPage({ basePath = '/deployments' }: Props) {
  const navigate = useNavigate();
  const { batches } = useDeploymentHistory();

  if (batches.length === 0) {
    return (
      <>
        <style>{css}</style>
        <Box p={6} display="flex" flexDirection="column" alignItems="center" gap={2}>
          <RocketLaunchIcon sx={{ fontSize: 48, color: '#CBD5E0' }} />
          <Typography variant="h6" color="text.secondary" fontWeight={600}>
            Nenhuma implantação realizada
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Após confirmar pedidos no carrinho, o histórico aparecerá aqui.
          </Typography>
          <Button variant="contained" onClick={() => navigate('/cloud-marketplace')} sx={{ mt: 1 }}>
            Ir para o Marketplace
          </Button>
        </Box>
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <Box px={{ xs: 3, md: 5 }} py={4} maxWidth={920} mx="auto">

        {/* Page header */}
        <Box mb={4}>
          <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
            Implantações
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Histórico de todas as execuções de provisionamento — inclui pipelines em andamento.
          </Typography>
        </Box>

        {/* Batch list */}
        <Box display="flex" flexDirection="column" gap={2}>
          {batches.map((batch, index) => {
            const batchStatus = getBatchLiveStatus(batch);
            const isInFlight  = batchStatus === 'in_flight';
            const successCount = batch.results.filter(r =>
              getItemLiveStatus(r.response.status, r.actionsStatus, r.response.requestId) === 'success'
            ).length;
            const totalCount = batch.results.length;

            const formattedDate = new Date(batch.timestamp).toLocaleString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            });

            const borderColor =
              isInFlight      ? '#BFDBFE' :
              batchStatus === 'success' ? '#A7F3D0' :
              batchStatus === 'partial' ? '#FDE68A' : '#FECACA';

            const bgColor =
              isInFlight      ? '#EFF6FF' :
              batchStatus === 'success' ? '#F0FFF4' :
              batchStatus === 'partial' ? '#FFFBEB' : '#FFF5F5';

            return (
              <Paper
                key={batch.batchId}
                variant="outlined"
                sx={{
                  borderRadius: 2.5,
                  borderColor,
                  bgcolor: bgColor,
                  cursor: 'pointer',
                  transition: 'box-shadow 0.15s, border-color 0.15s',
                  animation: 'fadeUp 0.25s ease both',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,48,135,0.10)',
                    borderColor: isInFlight ? '#93C5FD' : borderColor,
                  },
                  overflow: 'hidden',
                }}
                onClick={() => navigate(`${basePath}/${batch.batchId}`)}
              >
                {/* Card header */}
                <Box
                  display="flex" alignItems="center" justifyContent="space-between"
                  px={2.5} py={1.5} gap={2}
                  sx={{ borderBottom: `1px solid ${borderColor}` }}
                >
                  <Box display="flex" alignItems="center" gap={2} flex={1} minWidth={0}>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1.5} mb={0.25}>
                        <Typography variant="body1" fontWeight={800} color="text.primary">
                          Execução #{batches.length - index}
                        </Typography>
                        <StatusBadge status={batchStatus} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formattedDate}
                        {' · '}
                        {totalCount} {totalCount === 1 ? 'recurso' : 'recursos'}
                        {batchStatus !== 'in_flight' && (
                          <> · {successCount}/{totalCount} concluídos com sucesso</>
                        )}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Provider badges + arrow */}
                  <Box display="flex" alignItems="center" gap={1} flexShrink={0}>
                    <Box display="flex" gap={0.5} alignItems="center">
                      {[...new Set(batch.snapshot.map(item => item.offer.providerId))].map(providerId => (
                        <ProviderBadge key={providerId} provider={providerId} />
                      ))}
                    </Box>
                    <ChevronRightIcon sx={{ color: '#A0AEC0', flexShrink: 0 }} />
                  </Box>
                </Box>

              </Paper>
            );
          })}
        </Box>
      </Box>
    </>
  );
}
