import { Box, ButtonBase, Divider, List, Typography } from '@mui/material';
import { Cloud as CloudIcon, Storage as StorageIcon, History as HistoryIcon, BarChart as BarChartIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { SidebarUserInfo } from './SidebarUserInfo';

const SIDEBAR_WIDTH = 240;

export function Sidebar() {
  const navigate = useNavigate();
  return (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        minHeight: '100vh',
        backgroundColor: '#fff',
        borderRight: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <ButtonBase
        onClick={() => navigate('/cloud-marketplace')}
        sx={{
          px: 2.5, py: 2.5,
          display: 'flex', alignItems: 'center', gap: 1,
          justifyContent: 'flex-start',
          borderRadius: 1,
          '&:hover': { backgroundColor: 'rgba(0,48,135,0.05)' },
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 1.5,
            background: 'linear-gradient(135deg, #003087 0%, #0050B3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CloudIcon sx={{ color: '#fff', fontSize: 18 }} />
        </Box>
        <Box textAlign="left">
          <Typography variant="body2" fontWeight={800} color="#003087" lineHeight={1}>Cloud</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>Marketplace</Typography>
        </Box>
      </ButtonBase>

      <Divider sx={{ borderColor: '#E2E8F0' }} />

      {/* Nav */}
      <List disablePadding sx={{ flex: 1, pt: 1 }}>
        <SidebarItem icon={<CloudIcon fontSize="small" />} label="Cloud" to="/cloud-marketplace" />
        <SidebarItem icon={<StorageIcon fontSize="small" />} label="On-Premise" disabled />
        <SidebarItem icon={<HistoryIcon fontSize="small" />} label="Auditoria" disabled />
        <SidebarItem icon={<BarChartIcon fontSize="small" />} label="Métricas" disabled />
        <SidebarItem icon={<SettingsIcon fontSize="small" />} label="Configuração" disabled />
      </List>

      {/* User */}
      <SidebarUserInfo />
    </Box>
  );
}

export { SIDEBAR_WIDTH };
