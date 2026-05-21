import { Chip } from '@mui/material';
import type { OfferCategory } from '../../types';

const CATEGORY_LABELS: Record<OfferCategory, string> = {
  compute: 'Compute',
  storage: 'Storage',
  networking: 'Networking',
  database: 'Database',
  security: 'Security',
  monitoring: 'Monitoring',
  identity: 'Identity',
  other: 'Other',
};

interface Props {
  category: OfferCategory;
  size?: 'small' | 'medium';
  onClick?: () => void;
  selected?: boolean;
}

export function CategoryChip({ category, size = 'small', onClick, selected }: Props) {
  return (
    <Chip
      label={CATEGORY_LABELS[category]}
      size={size}
      onClick={onClick}
      variant={selected ? 'filled' : 'outlined'}
      sx={selected
        ? { backgroundColor: '#003087', color: '#fff', borderColor: '#003087', fontWeight: 600 }
        : { borderColor: '#CBD5E0', color: '#4A5568', '&:hover': { borderColor: '#003087', color: '#003087' } }
      }
    />
  );
}
