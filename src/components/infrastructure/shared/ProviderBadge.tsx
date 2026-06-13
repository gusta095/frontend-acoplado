import { Box, Tooltip } from '@mui/material';
import type { ProviderId } from '../../../types';

const PROVIDER_META: Record<ProviderId, { label: string; logo?: string; color: string }> = {
  aws:       { label: 'AWS',       logo: '/aws.png',    color: '#FF9900' },
  azure:     { label: 'Azure',     logo: '/azure.png',  color: '#0078D4' },
  oci:       { label: 'OCI',       logo: '/oracle.png', color: '#C74634' },
  vmware:    { label: 'VMware',                         color: '#1B9C2E' },
  proxmox:   { label: 'Proxmox',                        color: '#E57000' },
  baremetal: { label: 'Bare Metal',                     color: '#5A67D8' },
};

interface Props {
  provider: ProviderId;
  size?: 'small' | 'medium';
}

export function ProviderBadge({ provider, size = 'small' }: Props) {
  const meta = PROVIDER_META[provider];
  const dim = size === 'small' ? 36 : 52;

  if (meta.logo) {
    return (
      <Tooltip title={meta.label} placement="top">
        <Box
          sx={{
            width: dim, height: dim, flexShrink: 0,
            bgcolor: `${meta.color}15`,
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={meta.logo}
            alt={meta.label}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </Box>
      </Tooltip>
    );
  }

  // Fallback: colored text badge for providers without a logo
  return (
    <Tooltip title={meta.label} placement="top">
      <Box
        sx={{
          width: dim, height: dim, flexShrink: 0,
          bgcolor: `${meta.color}15`,
          border: `1.5px solid ${meta.color}30`,
          borderRadius: 2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: meta.color,
          fontWeight: 700,
          fontSize: size === 'small' ? '0.6rem' : '0.75rem',
          letterSpacing: '0.05em',
          textAlign: 'center',
          lineHeight: 1.2,
          px: 0.5,
        }}
      >
        {meta.label}
      </Box>
    </Tooltip>
  );
}
