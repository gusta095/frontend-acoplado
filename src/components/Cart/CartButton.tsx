import { useState } from 'react';
import { Badge, IconButton, Tooltip } from '@mui/material';
import { ShoppingCart as ShoppingCartIcon } from '@mui/icons-material';
import { useCart } from '../../context/CartContext';
import { CartDrawer } from './CartDrawer';

export function CartButton() {
  const { items } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Meus pedidos">
        <IconButton onClick={() => setOpen(true)} sx={{ color: '#003087' }}>
          <Badge badgeContent={items.length} color="primary" max={99}>
            <ShoppingCartIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
