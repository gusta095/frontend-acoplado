import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { Sidebar, SIDEBAR_WIDTH } from './Sidebar';
import { TopBar } from './TopBar';

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Box display="flex" minHeight="100vh" bgcolor="background.default">
      <Sidebar />
      <Box ml={`${SIDEBAR_WIDTH}px`} flex={1} display="flex" flexDirection="column">
        <TopBar />
        <Box component="main" sx={{ pt: '56px', flex: 1, overflow: 'auto' }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
