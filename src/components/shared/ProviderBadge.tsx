import { Chip } from '@mui/material';
import type { ProviderId } from '../../types';

const PROVIDER_META: Record<ProviderId, { label: string; color: string }> = {
  aws: { label: 'AWS', color: '#FF9900' },
  azure: { label: 'Azure', color: '#0078D4' },
  oci: { label: 'OCI', color: '#C74634' },
};

interface Props {
  provider: ProviderId;
  size?: 'small' | 'medium';
}

export function ProviderBadge({ provider, size = 'small' }: Props) {
  const meta = PROVIDER_META[provider];
  return (
    <Chip
      label={meta.label}
      size={size}
      sx={{
        backgroundColor: `${meta.color}18`,
        color: meta.color,
        border: `1px solid ${meta.color}40`,
        fontWeight: 700,
        fontSize: size === 'small' ? '0.7rem' : '0.8rem',
        letterSpacing: '0.05em',
      }}
    />
  );
}
