import { Box, Button, Divider, Drawer, IconButton, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import type { CartItem } from '../../../../types';
import { CartEmptyState } from './CartEmptyState';
import { CartItemCard } from './CartItemCard';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { items, removeItem } = useCart();

  const handleEdit = (item: CartItem) => {
    removeItem(item.id);
    onClose();
    const editValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(item.parameters)) {
      editValues[k] = String(v);
    }
    navigate(`/cloud-marketplace/${item.offer.providerId}/${item.offer.id}/provision`, {
      state: { editValues },
    });
  };

  const handleReview = () => {
    onClose();
    navigate('/checkout/review');
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 420, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box px={2.5} py={2} display="flex" alignItems="center" justifyContent="space-between" borderBottom="1px solid #E2E8F0">
        <Box>
          <Typography variant="h6" fontWeight={700} color="text.primary">Meus Pedidos</Typography>
          {items.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              {items.length} {items.length === 1 ? 'item' : 'itens'}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

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
              onEdit={handleEdit}
              removable
            />
          ))
        )}
      </Box>

      {/* Footer */}
      {items.length > 0 && (
        <>
          <Divider />
          <Box p={2}>
            <Button variant="contained" fullWidth size="large" onClick={handleReview}>
              Confirmar {items.length} {items.length === 1 ? 'pedido' : 'pedidos'}
            </Button>
          </Box>
        </>
      )}
    </Drawer>
  );
}
