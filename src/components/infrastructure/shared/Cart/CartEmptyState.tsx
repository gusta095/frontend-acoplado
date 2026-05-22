import { Box, Typography } from '@mui/material';
import { ShoppingCartOutlined as ShoppingCartOutlinedIcon } from '@mui/icons-material';

export function CartEmptyState() {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" flex={1} gap={2} py={6}>
      <ShoppingCartOutlinedIcon sx={{ fontSize: 56, color: '#CBD5E0' }} />
      <Typography variant="body1" fontWeight={600} color="text.secondary">Carrinho vazio</Typography>
      <Typography variant="body2" color="text.disabled" textAlign="center" px={2}>
        Navegue pelas ofertas e adicione recursos ao seu pedido.
      </Typography>
    </Box>
  );
}
