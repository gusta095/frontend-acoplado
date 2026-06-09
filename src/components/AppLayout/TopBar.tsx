import { AppBar, Box, Toolbar } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { GlobalSearchBar } from '../infrastructure/cloud/shared/GlobalSearchBar';
import { CartButton } from '../infrastructure/shared/Cart/CartButton';
import { OnPremiseCartButton } from '../infrastructure/onpremise/Cart/OnPremiseCartButton';
import { SIDEBAR_WIDTH } from './Sidebar';

export function TopBar() {
  const { pathname } = useLocation();
  const isOnPremise = pathname.startsWith('/on-premise');
  const isCloud = pathname.startsWith('/cloud-marketplace');

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        left: SIDEBAR_WIDTH,
        width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
        backgroundColor: '#fff',
        borderBottom: '1px solid #E2E8F0',
        zIndex: 99,
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: '56px !important' }}>
        <Box flex={1} display="flex" justifyContent="center">
          <GlobalSearchBar />
        </Box>
        {isCloud && <CartButton />}
        {isOnPremise && <OnPremiseCartButton />}
      </Toolbar>
    </AppBar>
  );
}
