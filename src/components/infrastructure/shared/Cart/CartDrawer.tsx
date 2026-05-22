import { Box, Button, CircularProgress, Divider, Drawer, IconButton, LinearProgress, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useCart } from '../../../../context/CartContext';
import { useProvisioning } from '../../../../hooks/useProvisioning';
import type { ProvisioningResponse } from '../../../../types';
import { CartEmptyState } from './CartEmptyState';
import { CartItemCard } from './CartItemCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

type Step = 'idle' | 'loading' | 'done';

export function CartDrawer({ open, onClose }: Props) {
  const { items, removeItem, clearCart } = useCart();
  const { provisionAll } = useProvisioning();
  const [step, setStep] = useState<Step>('idle');
  const [results, setResults] = useState<Map<string, ProvisioningResponse>>(new Map());

  const handleConfirm = async () => {
    setStep('loading');
    const requests = items.map(item => ({
      offerId: item.offer.id,
      providerId: item.offer.providerId,
      parameters: item.parameters,
    }));
    const responses = await provisionAll(requests);
    const map = new Map<string, ProvisioningResponse>();
    items.forEach((item, i) => map.set(item.id, responses[i]));
    setResults(map);
    setStep('done');
  };

  const handleClose = () => {
    if (step === 'done') {
      const allSuccess = Array.from(results.values()).every(r => r.status === 'accepted');
      if (allSuccess) clearCart();
      setStep('idle');
      setResults(new Map());
    }
    onClose();
  };

  const successCount = Array.from(results.values()).filter(r => r.status === 'accepted').length;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={step === 'loading' ? undefined : handleClose}
      PaperProps={{ sx: { width: 420, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box px={2.5} py={2} display="flex" alignItems="center" justifyContent="space-between" borderBottom="1px solid #E2E8F0">
        <Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">Meus Pedidos</Typography>
          {items.length > 0 && (
            <Typography variant="caption" color="text.secondary">{items.length} {items.length === 1 ? 'item' : 'itens'}</Typography>
          )}
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={step === 'loading'}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {step === 'loading' && <LinearProgress sx={{ height: 2 }} />}

      {/* Content */}
      <Box flex={1} overflow="auto" p={2} display="flex" flexDirection="column" gap={1.5}>
        {items.length === 0 ? (
          <CartEmptyState />
        ) : (
          items.map(item => (
            <CartItemCard
              key={item.id}
              item={item}
              onRemove={removeItem}
              result={results.get(item.id)}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      {items.length > 0 && step !== 'done' && (
        <>
          <Divider />
          <Box p={2}>
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handleConfirm}
              disabled={step === 'loading'}
              startIcon={step === 'loading' ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {step === 'loading' ? 'Provisionando...' : `Confirmar ${items.length} ${items.length === 1 ? 'pedido' : 'pedidos'}`}
            </Button>
          </Box>
        </>
      )}

      {step === 'done' && (
        <>
          <Divider />
          <Box p={2}>
            <Typography variant="body2" color="text.secondary" textAlign="center" mb={1.5}>
              {successCount} de {items.length} {items.length === 1 ? 'pedido confirmado' : 'pedidos confirmados'}
            </Typography>
            <Button variant="outlined" fullWidth onClick={handleClose}>Fechar</Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
