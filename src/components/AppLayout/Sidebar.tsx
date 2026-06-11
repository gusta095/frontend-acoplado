import { Box, ButtonBase, Collapse, Divider, List, ListItemButton, ListItemIcon, ListItemText, Typography } from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  Article as ArticleIcon,
  RocketLaunch as RocketLaunchIcon,
  Group as GroupIcon,
  Hub as HubIcon,
  Lock as LockIcon,
  Layers as LayersIcon,
  Visibility as VisibilityIcon,
  Settings as SettingsIcon,
  AccountTree as AccountTreeIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarItem } from './SidebarItem';
import { SidebarUserInfo } from './SidebarUserInfo';

const SIDEBAR_WIDTH = 240;

interface SidebarGroupProps {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}

function SidebarGroup({ label, icon, children, defaultOpen = true }: SidebarGroupProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <ListItemButton
        onClick={() => setOpen(prev => !prev)}
        sx={{
          borderRadius: 1.5,
          mx: 1,
          mt: 1,
          px: 1.5,
          py: 0.875,
          backgroundColor: 'rgba(0,48,135,0.07)',
          color: '#003087',
          '&:hover': { backgroundColor: 'rgba(0,48,135,0.12)' },
        }}
      >
        <ListItemIcon sx={{ minWidth: 32, color: '#003087' }}>
          {icon}
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{
            fontSize: '0.8rem',
            fontWeight: 700,
            color: '#003087',
          }}
        />
        {open
          ? <ExpandLess sx={{ fontSize: 16, color: '#003087' }} />
          : <ExpandMore sx={{ fontSize: 16, color: '#003087' }} />
        }
      </ListItemButton>

      <Collapse in={open} timeout={180} unmountOnExit>
        {children}
      </Collapse>
    </>
  );
}

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
        overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <ButtonBase
        onClick={() => navigate('/')}
        sx={{
          px: 2.5, py: 2.5,
          display: 'flex', alignItems: 'center', gap: 1.5,
          justifyContent: 'center',
          borderRadius: 1,
          flexShrink: 0,
          '&:hover': { backgroundColor: 'rgba(0,48,135,0.05)' },
        }}
      >
        <Box
          component="img"
          src="/b3-azul.png"
          alt="B3"
          sx={{
            width: 48,
            height: 48,
            borderRadius: 1.5,
            objectFit: 'contain',
            imageRendering: 'auto',
            flexShrink: 0,
          }}
        />
        <Box textAlign="left">
          <Typography variant="body2" fontWeight={800} color="#003087" lineHeight={1} noWrap>Sentinel Fusion Platform</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>Cloud & On-premise</Typography>
        </Box>
      </ButtonBase>

      <Divider sx={{ borderColor: '#E2E8F0' }} />

      {/* Nav */}
      <List disablePadding sx={{ flex: 1, pb: 1 }}>

        <SidebarGroup label="Infraestrutura" icon={<LayersIcon fontSize="small" />}>
          <SidebarItem icon={<CloudIcon fontSize="small" />} label="Cloud" to="/cloud-marketplace" />
          <SidebarItem icon={<StorageIcon fontSize="small" />} label="On-Premise" to="/on-premise" />
        </SidebarGroup>

        <SidebarGroup label="Observabilidade" icon={<VisibilityIcon fontSize="small" />} defaultOpen={false}>
          <SidebarGroup label="Implantações" icon={<RocketLaunchIcon fontSize="small" />} defaultOpen={false}>
            <SidebarItem icon={<CloudIcon fontSize="small" />} label="Cloud" to="/deployments" indent />
            <SidebarItem icon={<StorageIcon fontSize="small" />} label="On-Premise" to="/on-premise/deployments" indent />
          </SidebarGroup>
          <SidebarItem icon={<DashboardIcon fontSize="small" />} label="Dashboards" disabled />
          <SidebarItem icon={<BarChartIcon fontSize="small" />} label="Métricas" disabled />
          <SidebarItem icon={<ArticleIcon fontSize="small" />} label="Logs" disabled />
        </SidebarGroup>

        <SidebarGroup label="Configurações" icon={<SettingsIcon fontSize="small" />} defaultOpen={false}>
          <SidebarGroup label="Templates" icon={<AccountTreeIcon fontSize="small" />} defaultOpen={false}>
            <SidebarItem icon={<CloudIcon fontSize="small" />} label="Cloud" to="/configuracoes/templates/cloud" indent />
            <SidebarItem icon={<StorageIcon fontSize="small" />} label="On-Premise" to="/configuracoes/templates/on-premise" indent />
          </SidebarGroup>
          <SidebarItem icon={<GroupIcon fontSize="small" />} label="Cadastros" disabled />
          <SidebarItem icon={<HubIcon fontSize="small" />} label="Integrações" disabled />
          <SidebarItem icon={<LockIcon fontSize="small" />} label="Permissões" disabled />
        </SidebarGroup>

      </List>

      {/* User */}
      <SidebarUserInfo />
    </Box>
  );
}

export { SIDEBAR_WIDTH };
