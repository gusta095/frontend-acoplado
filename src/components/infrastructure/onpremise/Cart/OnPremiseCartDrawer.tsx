import { Box, Button, CircularProgress, Divider, Drawer, IconButton, LinearProgress, Typography } from '@mui/material';
import { Close as CloseIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnPremiseCart } from '../../../../context/OnPremiseCartContext';
import { useOnPremiseDeploymentHistory } from '../../../../context/OnPremiseDeploymentHistoryContext';
import { useOnPremiseSource } from '../../../../context/OnPremiseSourceContext';
import type { CartItem, ProvisioningRequest, ProvisioningResponse } from '../../../../types';
import { CartEmptyState } from '../../shared/Cart/CartEmptyState';
import { CartItemCard } from '../../shared/Cart/CartItemCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'idle' | 'loading' | 'done';

export function OnPremiseCartDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { items, removeItem } = useOnPremiseCart();
  const { addBatch } = useOnPremiseDeploymentHistory();
  const { onPremiseClient } = useOnPremiseSource();

  const provisionAll = async (requests: ProvisioningRequest[]): Promise<ProvisioningResponse[]> => {
    const responses: ProvisioningResponse[] = [];
    for (const req of requests) {
      responses.push(await onPremiseClient.provision(req));
    }
    return responses;
  };
  const [step, setStep] = useState<Step>('idle');
  const [results, setResults] = useState<Map<string, ProvisioningResponse>>(new Map());
  const [snapshot, setSnapshot] = useState<CartItem[]>([]);
  const [currentBatchId, setCurrentBatchId] = useState('');

  const handleConfirm = async () => {
    const currentItems = [...items];
    const batchId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    setCurrentBatchId(batchId);
    setSnapshot(currentItems);
    setStep('loading');

    const requests = currentItems.map(item => ({
      offerId: item.offer.id,
      providerId: item.offer.providerId,
      parameters: item.parameters,
    }));

    const responses = await provisionAll(requests);

    const map = new Map<string, ProvisioningResponse>();
    currentItems.forEach((item, i) => map.set(item.id, responses[i]));
    setResults(map);

    currentItems.forEach((item, i) => {
      if (responses[i].status === 'accepted') removeItem(item.id);
    });

    addBatch({
      batchId,
      timestamp,
      snapshot: currentItems,
      results: currentItems.map((item, i) => ({ itemId: item.id, response: responses[i] })),
    });

    setStep('done');
  };

  const handleEdit = (item: CartItem) => {
    removeItem(item.id);
    onClose();
    const editValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(item.parameters)) {
      editValues[k] = String(v);
    }
    navigate(`/on-premise/${item.offer.providerId}/${item.offer.id}/provision`, {
      state: { editValues },
    });
  };

  const handleRetry = () => {
    setStep('idle');
    setResults(new Map());
    setSnapshot([]);
    setCurrentBatchId('');
  };

  const handleClose = () => {
    if (step !== 'loading') {
      const targetBatchId = currentBatchId;
      const wasDone = step === 'done';
      setStep('idle');
      setResults(new Map());
      setSnapshot([]);
      setCurrentBatchId('');
      onClose();
      if (wasDone && targetBatchId) {
        navigate(`/on-premise/deployments/${targetBatchId}`);
      }
    }
  };

  const displayItems = step === 'idle' ? items : snapshot;
  const failureCount = Array.from(results.values()).filter(r => r.status !== 'accepted').length;
  const successCount = Array.from(results.values()).filter(r => r.status === 'accepted').length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={step === 'loading' ? undefined : handleClose}
      PaperProps={{ sx: { width: 420, display: 'flex', flexDirection: 'column' } }}
    >
      <Box px={2.5} py={2} display="flex" alignItems="center" justifyContent="space-between" borderBottom="1px solid #E2E8F0">
        <Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">Meus Pedidos</Typography>
          {displayItems.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {displayItems.length} {displayItems.length === 1 ? 'item' : 'itens'}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={step === 'loading'}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {step === 'loading' && <LinearProgress sx={{ height: 2 }} />}

      <Box flex={1} overflow="auto" p={2} display="flex" flexDirection="column" gap={1.5}>
        {displayItems.length === 0 ? (
          <CartEmptyState />
        ) : (
          displayItems.map(item => (
            <CartItemCard
              key={item.id}
              item={item}
              onRemove={removeItem}
              onEdit={handleEdit}
              removable={step === 'idle'}
              result={results.get(item.id)}
            />
          ))
        )}
      </Box>

      {step === 'idle' && items.length > 0 && (
        <>
          <Divider />
          <Box p={2}>
            <Button variant="contained" fullWidth size="large" onClick={handleConfirm}>
              Confirmar {items.length} {items.length === 1 ? 'pedido' : 'pedidos'}
            </Button>
          </Box>
        </>
      )}

      {step === 'loading' && (
        <>
          <Divider />
          <Box p={2}>
            <Button variant="contained" fullWidth size="large" disabled startIcon={<CircularProgress size={16} color="inherit" />}>
              Provisionando...
            </Button>
          </Box>
        </>
      )}

      {step === 'done' && (
        <>
          <Divider />
          <Box p={2} display="flex" flexDirection="column" gap={1.5}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              <Typography component="span" fontWeight={700} color="success.main">{successCount}</Typography>
              {' de '}
              <Typography component="span" fontWeight={700}>{snapshot.length}</Typography>
              {snapshot.length === 1 ? ' pedido confirmado' : ' pedidos confirmados'}
            </Typography>

            {failureCount > 0 && (
              <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
                {failureCount} {failureCount === 1 ? 'item permaneceu' : 'itens permaneceram'} no carrinho.
              </Typography>
            )}

            <Box display="flex" gap={1}>
              {failureCount > 0 && (
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<RefreshIcon />}
                  onClick={handleRetry}
                  sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
                >
                  Tentar novamente
                </Button>
              )}
              <Button variant={failureCount > 0 ? 'text' : 'outlined'} fullWidth onClick={handleClose}>
                Ver detalhes
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Drawer>
  );
}