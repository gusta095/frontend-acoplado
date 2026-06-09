import { Badge, IconButton, Tooltip } from '@mui/material';
import { ShoppingCart as CartIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useOnPremiseCart } from '../../../../context/OnPremiseCartContext';
import { OnPremiseCartDrawer } from './OnPremiseCartDrawer';

export function OnPremiseCartButton() {
  const { items } = useOnPremiseCart();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Meus pedidos">
        <IconButton onClick={() => setOpen(true)} sx={{ color: '#003087' }}>
          <Badge badgeContent={items.length} color="primary" max={99}>
            <CartIcon />
          </Badge>
        </IconButton>
      </Tooltip>
      <OnPremiseCartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
