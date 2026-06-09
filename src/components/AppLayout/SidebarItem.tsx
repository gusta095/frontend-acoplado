import { Box, ListItemButton, ListItemIcon, ListItemText, Tooltip } from '@mui/material';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface Props {
  icon: ReactNode;
  label: string;
  to?: string;
  disabled?: boolean;
  indent?: boolean;
}

export function SidebarItem({ icon, label, to, disabled, indent }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isActive = to ? pathname.startsWith(to) : false;

  const item = (
    <ListItemButton
      onClick={() => !disabled && to && navigate(to)}
      disabled={disabled}
      sx={{
        borderRadius: 1.5,
        mx: 1,
        mb: 0.5,
        pl: indent ? 3.5 : 1.5,
        pr: 1.5,
        py: 1,
        backgroundColor: isActive ? 'rgba(0,48,135,0.1)' : 'transparent',
        color: isActive ? '#003087' : '#4A5568',
        '&:hover': { backgroundColor: isActive ? 'rgba(0,48,135,0.15)' : 'rgba(0,0,0,0.04)' },
        '&.Mui-disabled': { opacity: 0.45 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText
        primary={label}
        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: isActive ? 700 : 500 }}
      />
      {isActive && (
        <Box sx={{ width: 3, height: 20, borderRadius: 4, backgroundColor: '#003087', ml: 1 }} />
      )}
    </ListItemButton>
  );

  if (disabled) {
    return <Tooltip title="Em breve" placement="right">{item}</Tooltip>;
  }
  return item;
}
