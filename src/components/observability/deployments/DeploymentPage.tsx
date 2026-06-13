import { useState } from 'react';
import {
  Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider,
  IconButton, Paper, Tooltip, Typography,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  Cloud as CloudIcon,
  RocketLaunch as RocketLaunchIcon,
  DataObject as PayloadIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  ErrorOutline as WarningIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeploymentHistory } from '../../../context/DeploymentHistoryContext';
import { ProviderBadge } from '../../infrastructure/shared/ProviderBadge';
import { GitHubActionsStatus } from './GitHubActionsStatus';
import type { CartItem } from '../../../types';

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  try {
    const match = url.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/);
    if (!match) return null;
    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}

function buildFinalPayload(items: CartItem[]) {
  return {
    resources: items.map(item => ({
      template: `${item.offer.providerId}/${item.offer.id}`,
      payload: item.parameters,
    })),
  };
}

function PayloadDialog({ items, open, onClose }: { items: CartItem[]; open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(buildFinalPayload(items), null, 2);

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
            <Typography fontWeight={700}>Payload final</Typography>
            <Typography variant="caption" color="text.secondary">
              {items.length} {items.length === 1 ? 'recurso' : 'recursos'}
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

interface Props {
  basePath?: string;
  marketplacePath?: string;
}

export function DeploymentPage({ basePath = '/deployments', marketplacePath = '/cloud-marketplace' }: Props) {
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, getBatch } = useDeploymentHistory();
  const batch = getBatch(batchId ?? '');
  const [payloadOpen, setPayloadOpen] = useState(false);

  if (!batch) {
    return (
      <Box p={6} display="flex" flexDirection="column" alignItems="center" gap={2}>
        <RocketLaunchIcon sx={{ fontSize: 48, color: '#CBD5E0' }} />
        <Typography variant="h6" color="text.secondary" fontWeight={600}>
          Implantação não encontrada
        </Typography>
        <Typography variant="body2" color="text.disabled">
          Este lote pode ter sido removido ou o link é inválido.
        </Typography>
        <Button variant="contained" onClick={() => navigate(basePath)} sx={{ mt: 1 }}>
          Ver histórico
        </Button>
      </Box>
    );
  }

  const { timestamp, snapshot, results } = batch;
  const resultMap = new Map(results.map(r => [r.itemId, r.response]));
  const successCount = results.filter(r => r.response.status === 'accepted').length;
  const failureCount = results.length - successCount;
  const allSuccess = failureCount === 0;
  const batchIndex = batches.findIndex(b => b.batchId === batchId);
  const batchNumber = batches.length - batchIndex;

  const formattedDate = new Date(timestamp).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <Box p={{ xs: 3, md: 5 }} maxWidth={800}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(basePath)}
        sx={{ mb: 3, color: 'text.secondary', px: 0, '&:hover': { backgroundColor: 'transparent', color: 'text.primary' } }}
        disableRipple
      >
        Histórico de implantações
      </Button>

      {/* Batch header */}
      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={3} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
            Lote #{batchNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formattedDate} · {results.length} {results.length === 1 ? 'recurso' : 'recursos'}
          </Typography>
        </Box>
        <Chip
          icon={allSuccess
            ? <CheckCircleIcon sx={{ fontSize: '16px !important' }} />
            : <ErrorIcon sx={{ fontSize: '16px !important' }} />
          }
          label={allSuccess
            ? `${successCount} ${successCount === 1 ? 'pedido confirmado' : 'pedidos confirmados'}`
            : `${successCount} de ${results.length} confirmados`
          }
          sx={{
            fontWeight: 700, fontSize: '0.8rem', height: 32,
            backgroundColor: allSuccess ? '#F0FFF4' : '#FFF5F5',
            color: allSuccess ? '#276749' : '#C53030',
            border: `1px solid ${allSuccess ? '#9AE6B4' : '#FEB2B2'}`,
            '& .MuiChip-icon': { color: allSuccess ? '#38A169' : '#E53E3E' },
          }}
        />
      </Box>

      {/* Resource cards */}
      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        {snapshot.map(item => {
          const result = resultMap.get(item.id);
          const success = result?.status === 'accepted';
          const labelMap = Object.fromEntries(item.offer.parameters.map(p => [p.key, p.label]));
          const ghUrl = result?.requestId ? parseGitHubUrl(result.requestId) : null;
          const visibleParams = Object.entries(item.parameters).filter(([, val]) => val !== '' && val != null);

          return (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: 2.5, borderRadius: 2,
                borderColor: success ? '#9AE6B4' : '#FEB2B2',
                backgroundColor: success ? '#F0FFF4' : '#FFF5F5',
              }}
            >
              {/* Card header */}
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={1} mb={1.5}>
                <Box display="flex" alignItems="center" gap={1}>
                  {success
                    ? <CheckCircleIcon sx={{ color: '#38A169', fontSize: 18 }} />
                    : <ErrorIcon sx={{ color: '#E53E3E', fontSize: 18 }} />
                  }
                  <Typography variant="body2" fontWeight={700} color="text.primary">
                    {item.offer.name}
                  </Typography>
                  <ProviderBadge provider={item.offer.providerId} />
                </Box>
                <Chip
                  label={success ? 'Confirmado' : 'Falhou'}
                  size="small"
                  sx={{
                    fontWeight: 700, fontSize: '0.65rem', height: 20,
                    backgroundColor: success ? '#C6F6D5' : '#FED7D7',
                    color: success ? '#276749' : '#C53030',
                  }}
                />
              </Box>

              {/* Parameter chips */}
              {visibleParams.length > 0 && (
                <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
                  {visibleParams.map(([key, val]) => (
                    <Chip
                      key={key}
                      label={`${labelMap[key] ?? key}: ${val}`}
                      size="small"
                      sx={{ fontSize: '0.65rem', height: 20, backgroundColor: 'rgba(0,0,0,0.06)', color: '#4A5568' }}
                    />
                  ))}
                </Box>
              )}

              {/* GitHub section (success with repo URL) */}
              {success && ghUrl && result?.requestId && (
                <>
                  <Divider sx={{ borderColor: '#9AE6B4', mb: 1.5 }} />
                  <GitHubActionsStatus
                    owner={ghUrl.owner}
                    repo={ghUrl.repo}
                    repoUrl={result.requestId}
                  />
                </>
              )}

              {/* Error message (failures) */}
              {!success && result?.message && (
                <>
                  <Divider sx={{ borderColor: '#FEB2B2', mb: 1.5 }} />
                  <Box
                    display="flex" alignItems="flex-start" gap={1}
                    sx={{ bgcolor: '#FFF0F0', borderRadius: 1.5, px: 1.5, py: 1.25, border: '1px solid #FED7D7' }}
                  >
                    <WarningIcon sx={{ fontSize: 16, color: '#E53E3E', mt: '1px', flexShrink: 0 }} />
                    <Typography variant="caption" color="#C53030" lineHeight={1.5}>
                      {result.message}
                    </Typography>
                  </Box>
                </>
              )}

              {/* Footer: timestamp */}
              <Box mt={1.5} display="flex" justifyContent="flex-end">
                <Typography variant="caption" color="text.disabled" fontSize="0.68rem">
                  {result?.timestamp ? new Date(result.timestamp).toLocaleString('pt-BR') : '—'}
                </Typography>
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Bottom actions */}
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <Button variant="contained" startIcon={<CloudIcon />} onClick={() => navigate(marketplacePath)}>
          Novo provisionamento
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate(basePath)}
          sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
        >
          Ver histórico
        </Button>
        <Button
          size="small"
          startIcon={<PayloadIcon fontSize="small" />}
          onClick={() => setPayloadOpen(true)}
          sx={{ ml: 'auto', color: 'text.disabled', fontSize: '0.72rem' }}
        >
          Ver payload
        </Button>
      </Box>

      <PayloadDialog items={snapshot} open={payloadOpen} onClose={() => setPayloadOpen(false)} />
    </Box>
  );
}
