import { useEffect, useRef, useState } from 'react';
import { Box, Button, LinearProgress, Typography } from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  RocketLaunch as RocketIcon,
  AddCircleOutline as AddIcon,
  ReceiptLong as ReceiptIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { useDeploymentHistory } from '../../../../context/DeploymentHistoryContext';
import { useTemplateSource } from '../../../../context/TemplateSourceContext';
import { CLOUD_PROVIDERS } from '../../../../api/cloudProviders';
import type { CartItem, ProviderId } from '../../../../types';

const css = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes pulse-ring {
    0%   { box-shadow: 0 0 0 0 rgba(0,80,179,0.25); }
    70%  { box-shadow: 0 0 0 8px rgba(0,80,179,0); }
    100% { box-shadow: 0 0 0 0 rgba(0,80,179,0); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  @keyframes fill-line {
    from { height: 0%; }
    to   { height: 100%; }
  }
`;

type StepStatus = 'pending' | 'running' | 'success' | 'failed';

interface StepState {
  item: CartItem;
  status: StepStatus;
  message?: string;
  duration?: number;
}

interface LocationState {
  items: CartItem[];
  destination: Record<string, string>;
}

function getProvider(id: ProviderId) {
  return CLOUD_PROVIDERS.find(p => p.id === id);
}

function SpinnerIcon() {
  return (
    <Box
      sx={{
        width: 20, height: 20, borderRadius: '50%',
        border: '2.5px solid #BFDBFE',
        borderTopColor: '#0050B3',
        animation: 'spin 0.8s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}

function PendingIcon() {
  return (
    <Box sx={{
      width: 20, height: 20, borderRadius: '50%',
      border: '2px solid #CBD5E1',
      bgcolor: 'transparent',
      flexShrink: 0,
    }} />
  );
}

interface StepRowProps {
  step: StepState;
  index: number;
  isLast: boolean;
  prevDone: boolean;
}

function StepRow({ step, index, isLast }: StepRowProps) {
  const provider = getProvider(step.item.offer.providerId);
  const isRunning  = step.status === 'running';
  const isSuccess  = step.status === 'success';
  const isFailed   = step.status === 'failed';
  const isPending  = step.status === 'pending';
  const isDone     = isSuccess || isFailed;

  const lineFilled = isSuccess || isFailed;

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0,
        animation: `fadeUp 0.3s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Timeline column */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        {/* Icon */}
        <Box sx={{ pt: '18px', zIndex: 1 }}>
          {isRunning  && <SpinnerIcon />}
          {isSuccess  && <CheckCircleIcon sx={{ fontSize: 20, color: '#10B981' }} />}
          {isFailed   && <ErrorIcon       sx={{ fontSize: 20, color: '#EF4444' }} />}
          {isPending  && <PendingIcon />}
        </Box>

        {/* Connector line */}
        {!isLast && (
          <Box sx={{ flex: 1, width: 2, bgcolor: '#E2E8F0', position: 'relative', mt: '4px', mb: '2px', minHeight: 24 }}>
            <Box sx={{
              position: 'absolute', top: 0, left: 0, width: '100%',
              bgcolor: '#0050B3',
              height: lineFilled ? '100%' : '0%',
              transition: 'height 0.5s ease',
              borderRadius: 1,
            }} />
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          flex: 1,
          ml: 1.5,
          mt: '10px',
          mb: isLast ? 2 : 1.5,
          borderRadius: 2,
          border: isRunning ? '1px solid #BFDBFE' : '1px solid transparent',
          bgcolor: isRunning ? '#EFF6FF' : isFailed ? '#FEF2F2' : isSuccess ? '#F0FDF4' : 'transparent',
          px: 2,
          py: 1.5,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          ...(isRunning && {
            animation: 'pulse-ring 2s ease-out infinite',
          }),
        }}
      >
        {/* Shimmer on running */}
        {isRunning && (
          <Box sx={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,80,179,0.04) 50%, transparent 100%)',
            backgroundSize: '400px 100%',
            animation: 'shimmer 2s linear infinite',
          }} />
        )}

        <Box display="flex" alignItems="center" justifyContent="space-between" gap={1}>
          <Box display="flex" alignItems="center" gap={1.25} minWidth={0}>
            {provider?.logoUrl && (
              <Box
                component="img"
                src={provider.logoUrl}
                alt={provider.shortName}
                sx={{ width: 28, height: 28, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
            <Box minWidth={0}>
              <Typography
                variant="body2"
                fontWeight={isRunning ? 700 : isDone ? 600 : 400}
                color={isFailed ? '#EF4444' : isRunning ? '#003087' : isPending ? 'text.disabled' : 'text.primary'}
                noWrap
              >
                {step.item.offer.name}
              </Typography>
              {isRunning && (
                <Typography variant="caption" color="#0050B3" sx={{ display: 'block', mt: 0.25 }}>
                  Executando...
                </Typography>
              )}
              {isFailed && step.message && (
                <Typography variant="caption" color="#EF4444" sx={{ display: 'block', mt: 0.25 }}>
                  {step.message}
                </Typography>
              )}
            </Box>
          </Box>

          <Box flexShrink={0} textAlign="right">
            {isSuccess && step.duration != null && (
              <Typography variant="caption" color="text.disabled">
                {(step.duration / 1000).toFixed(1)}s
              </Typography>
            )}
            {isPending && (
              <Typography variant="caption" color="text.disabled">Aguardando</Typography>
            )}
            {isFailed && (
              <Typography variant="caption" color="#EF4444" fontWeight={600}>Falhou</Typography>
            )}
            {isSuccess && (
              <Typography variant="caption" color="#10B981" fontWeight={600}>Concluído</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export function ProvisioningProgressPage() {
  const location   = useLocation();
  const navigate   = useNavigate();
  const { removeItem }  = useCart();
  const { addBatch }    = useDeploymentHistory();
  const { cloudClient } = useTemplateSource();

  const state = location.state as LocationState | null;
  const items       = state?.items ?? [];
  const destination = state?.destination ?? {};

  const [steps, setSteps] = useState<StepState[]>(() =>
    items.map(item => ({ item, status: 'pending' as StepStatus }))
  );
  const [done, setDone]               = useState(false);
  const [currentBatchId, setBatchId]  = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (!state || items.length === 0) { navigate('/cloud-marketplace'); return; }
    if (started.current) return;
    started.current = true;

    const run = async () => {
      const batchId   = crypto.randomUUID();
      const timestamp = new Date().toISOString();
      const responses: { requestId: string; status: 'accepted' | 'failed'; message: string; timestamp: string }[] = [];

      for (let i = 0; i < items.length; i++) {
        setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'running' } : s));
        const start = Date.now();
        try {
          const response = await cloudClient.provision({
            offerId:    items[i].offer.id,
            providerId: items[i].offer.providerId,
            parameters: { ...items[i].parameters, ...destination },
          });
          const duration = Date.now() - start;
          responses.push(response);
          setSteps(prev => prev.map((s, idx) => idx === i ? {
            ...s,
            status:   response.status === 'accepted' ? 'success' : 'failed',
            message:  response.message,
            duration,
          } : s));
          if (response.status === 'accepted') removeItem(items[i].id);
        } catch {
          const fallback = { requestId: '', status: 'failed' as const, message: 'Erro inesperado', timestamp: new Date().toISOString() };
          responses.push(fallback);
          setSteps(prev => prev.map((s, idx) => idx === i ? { ...s, status: 'failed', message: 'Erro inesperado' } : s));
        }
      }

      addBatch({
        batchId, timestamp,
        snapshot: items.map(item => ({
          ...item,
          parameters: { ...item.parameters, ...destination },
        })),
        results: items.map((item, i) => ({ itemId: item.id, response: responses[i] })),
      });
      setBatchId(batchId);
      setDone(true);
    };

    run();
  }, []);

  const completed    = steps.filter(s => s.status === 'success' || s.status === 'failed').length;
  const successCount = steps.filter(s => s.status === 'success').length;
  const failCount    = steps.filter(s => s.status === 'failed').length;
  const progress     = items.length > 0 ? (completed / items.length) * 100 : 0;
  const allOk        = done && failCount === 0;

  return (
    <>
      <style>{css}</style>
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 6 }, py: 5 }}>
        <Box maxWidth={680} mx="auto">

          {/* Header */}
          <Box mb={4} sx={{ animation: 'fadeUp 0.3s ease both' }}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, flexShrink: 0,
                background: done
                  ? allOk ? 'linear-gradient(135deg,#059669,#10B981)' : 'linear-gradient(135deg,#D97706,#F59E0B)'
                  : 'linear-gradient(135deg,#003087,#0050B3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.5s ease',
                ...((!done) && { animation: 'pulse-ring 2s ease-out infinite' }),
              }}>
                <RocketIcon sx={{ color: '#fff', fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.1}>
                  {done ? (allOk ? 'Provisionamento concluído' : 'Provisionamento finalizado') : 'Provisionando recursos'}
                </Typography>
                <Typography variant="body2" color="text.secondary" mt={0.25}>
                  {done
                    ? `${successCount} de ${items.length} recursos criados com sucesso`
                    : `${completed} de ${items.length} recursos concluídos`
                  }
                </Typography>
              </Box>
            </Box>

            {/* Progress bar */}
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6, borderRadius: 3, bgcolor: '#E2E8F0',
                '& .MuiLinearProgress-bar': {
                  bgcolor: done ? (allOk ? '#10B981' : '#F59E0B') : '#0050B3',
                  borderRadius: 3,
                  transition: 'transform 0.4s ease, background-color 0.5s ease',
                },
              }}
            />
          </Box>

          {/* Pipeline steps */}
          <Box
            sx={{
              bgcolor: '#fff',
              border: '1px solid #E2ECF6',
              borderRadius: 3,
              px: 2,
              pt: 1,
              pb: 0.5,
              mb: done ? 3 : 0,
            }}
          >
            {steps.map((step, i) => (
              <StepRow
                key={step.item.id}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                prevDone={i === 0 || steps[i - 1].status === 'success' || steps[i - 1].status === 'failed'}
              />
            ))}
          </Box>

          {/* Result banner */}
          {done && (
            <Box sx={{ animation: 'fadeUp 0.4s ease both' }}>
              {/* Summary */}
              <Box
                sx={{
                  borderRadius: 3,
                  border: `1px solid ${allOk ? '#A7F3D0' : '#FDE68A'}`,
                  bgcolor: allOk ? '#F0FDF4' : '#FFFBEB',
                  px: 3, py: 2.5,
                  mb: 2.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                {allOk
                  ? <CheckCircleIcon sx={{ fontSize: 28, color: '#10B981', flexShrink: 0 }} />
                  : <ErrorIcon       sx={{ fontSize: 28, color: '#F59E0B', flexShrink: 0 }} />
                }
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color={allOk ? '#065F46' : '#92400E'}>
                    {allOk
                      ? `${successCount} ${successCount === 1 ? 'recurso criado' : 'recursos criados'} com sucesso`
                      : `${successCount} de ${items.length} ${items.length === 1 ? 'recurso criado' : 'recursos criados'}`
                    }
                  </Typography>
                  {failCount > 0 && (
                    <Typography variant="body2" color="#92400E" mt={0.25}>
                      {failCount} {failCount === 1 ? 'recurso falhou' : 'recursos falharam'} — verifique os detalhes acima
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* CTAs */}
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<ReceiptIcon />}
                  onClick={() => navigate(`/deployments/${currentBatchId}`)}
                  sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
                >
                  Ver detalhes da implantação
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<AddIcon />}
                  onClick={() => navigate('/cloud-marketplace')}
                  sx={{ borderRadius: 2, fontWeight: 600, borderColor: '#E2E8F0', color: 'text.secondary', px: 3 }}
                >
                  Provisionar mais
                </Button>
              </Box>
            </Box>
          )}

        </Box>
      </Box>
    </>
  );
}
