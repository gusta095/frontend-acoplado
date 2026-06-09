import { Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import {
  RocketLaunch as RocketLaunchIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useDeploymentHistory } from '../../../context/DeploymentHistoryContext';

interface Props {
  basePath?: string;
}

export function DeploymentsListPage({ basePath = '/deployments' }: Props) {
  const navigate = useNavigate();
  const { batches } = useDeploymentHistory();

  if (batches.length === 0) {
    return (
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
    );
  }

  return (
    <Box p={{ xs: 3, md: 5 }} maxWidth={760}>
      <Box mb={4}>
        <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
          Implantações
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Histórico de todos os lotes de provisionamento confirmados.
        </Typography>
      </Box>

      <Box display="flex" flexDirection="column" gap={1.5}>
        {batches.map((batch, index) => {
          const successCount = batch.results.filter(r => r.response.status === 'accepted').length;
          const failureCount = batch.results.length - successCount;
          const allSuccess = failureCount === 0;

          const formattedDate = new Date(batch.timestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          });

          return (
            <Paper
              key={batch.batchId}
              variant="outlined"
              onClick={() => navigate(`${basePath}/${batch.batchId}`)}
              sx={{
                p: 2.5,
                borderRadius: 2,
                borderColor: '#E2E8F0',
                cursor: 'pointer',
                transition: 'box-shadow 0.15s, border-color 0.15s',
                '&:hover': {
                  boxShadow: '0 2px 12px rgba(0,48,135,0.08)',
                  borderColor: '#003087',
                },
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                <Box display="flex" alignItems="center" gap={2} flex={1} minWidth={0}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: 1.5,
                      backgroundColor: allSuccess ? '#F0FFF4' : '#FFF5F5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {allSuccess
                      ? <CheckCircleIcon sx={{ fontSize: 18, color: '#38A169' }} />
                      : <ErrorIcon sx={{ fontSize: 18, color: '#E53E3E' }} />
                    }
                  </Box>

                  <Box flex={1} minWidth={0}>
                    <Box display="flex" alignItems="center" gap={1} mb={0.25}>
                      <Typography variant="body2" fontWeight={700} color="text.primary" noWrap>
                        Lote #{batches.length - index}
                      </Typography>
                      <Chip
                        label={allSuccess ? 'Sucesso' : `${failureCount} falha${failureCount > 1 ? 's' : ''}`}
                        size="small"
                        sx={{
                          fontSize: '0.62rem',
                          height: 18,
                          fontWeight: 700,
                          backgroundColor: allSuccess ? '#C6F6D5' : '#FED7D7',
                          color: allSuccess ? '#276749' : '#C53030',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formattedDate} · {batch.results.length} {batch.results.length === 1 ? 'pedido' : 'pedidos'} · {successCount} confirmado{successCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>
                </Box>

                <ChevronRightIcon sx={{ color: '#A0AEC0', flexShrink: 0 }} />
              </Box>

              {batch.snapshot.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5, borderColor: '#F7FAFC' }} />
                  <Box display="flex" gap={0.75} flexWrap="wrap">
                    {batch.snapshot.map(item => (
                      <Chip
                        key={item.id}
                        label={item.offer.name}
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#EDF2F7', color: '#4A5568' }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
