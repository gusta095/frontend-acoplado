import { Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ArrowBack as ArrowBackIcon,
  Cloud as CloudIcon,
  RocketLaunch as RocketLaunchIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeploymentHistory } from '../../../context/DeploymentHistoryContext';
import { ProviderBadge } from '../../infrastructure/shared/ProviderBadge';

export function DeploymentPage() {
  const navigate = useNavigate();
  const { batchId } = useParams<{ batchId: string }>();
  const { batches, getBatch } = useDeploymentHistory();
  const batch = getBatch(batchId ?? '');

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
        <Button variant="contained" onClick={() => navigate('/deployments')} sx={{ mt: 1 }}>
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
    <Box p={{ xs: 3, md: 5 }} maxWidth={760}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/deployments')}
        sx={{ mb: 3, color: 'text.secondary', px: 0, '&:hover': { backgroundColor: 'transparent', color: 'text.primary' } }}
        disableRipple
      >
        Histórico de implantações
      </Button>

      <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={3} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
            Lote #{batchNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Confira o resultado de cada pedido submetido.
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
            fontWeight: 700,
            fontSize: '0.8rem',
            height: 32,
            backgroundColor: allSuccess ? '#F0FFF4' : '#FFF5F5',
            color: allSuccess ? '#276749' : '#C53030',
            border: `1px solid ${allSuccess ? '#9AE6B4' : '#FEB2B2'}`,
            '& .MuiChip-icon': { color: allSuccess ? '#38A169' : '#E53E3E' },
          }}
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 2.5, borderRadius: 2, borderColor: '#E2E8F0', mb: 3, backgroundColor: '#FAFBFC' }}
      >
        <Box display="flex" gap={4} flexWrap="wrap">
          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
              ID DO LOTE
            </Typography>
            <Typography variant="body2" color="text.primary" fontFamily="monospace" fontWeight={600}>
              {batchId}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
              DATA E HORA
            </Typography>
            <Typography variant="body2" color="text.primary">{formattedDate}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
              TOTAL DE PEDIDOS
            </Typography>
            <Typography variant="body2" color="text.primary">{results.length}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box display="flex" flexDirection="column" gap={2} mb={4}>
        {snapshot.map(item => {
          const result = resultMap.get(item.id);
          const success = result?.status === 'accepted';
          const labelMap = Object.fromEntries(item.offer.parameters.map(p => [p.key, p.label]));

          return (
            <Paper
              key={item.id}
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: success ? '#9AE6B4' : '#FEB2B2',
                backgroundColor: success ? '#F0FFF4' : '#FFF5F5',
              }}
            >
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

              <Box display="flex" flexWrap="wrap" gap={0.75} mb={1.5}>
                {Object.entries(item.parameters).map(([key, val]) => (
                  <Chip
                    key={key}
                    label={`${labelMap[key] ?? key}: ${val}`}
                    size="small"
                    sx={{ fontSize: '0.65rem', height: 20, backgroundColor: 'rgba(0,0,0,0.05)', color: '#4A5568' }}
                  />
                ))}
              </Box>

              <Divider sx={{ borderColor: success ? '#9AE6B4' : '#FEB2B2', mb: 1.5 }} />

              <Box display="flex" gap={4} flexWrap="wrap">
                {result?.requestId && (
                  <Box>
                    <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
                      REQUEST ID
                    </Typography>
                    <Typography variant="caption" fontFamily="monospace" color="text.primary">
                      {result.requestId}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
                    MENSAGEM
                  </Typography>
                  <Typography variant="caption" color={success ? 'success.main' : 'error.main'} fontWeight={600}>
                    {result?.message ?? '—'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
                    TIMESTAMP
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {result?.timestamp ? new Date(result.timestamp).toLocaleString('pt-BR') : '—'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          );
        })}
      </Box>

      <Box display="flex" gap={2} flexWrap="wrap">
        <Button variant="contained" startIcon={<CloudIcon />} onClick={() => navigate('/cloud-marketplace')}>
          Novo provisionamento
        </Button>
        <Button
          variant="outlined"
          onClick={() => navigate('/deployments')}
          sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
        >
          Ver histórico
        </Button>
      </Box>
    </Box>
  );
}
