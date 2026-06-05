import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import { CleaningServices as CleaningServicesIcon } from '@mui/icons-material';
import type { OfferCategory } from '../../../../types';
import { CategoryChip } from '../CategoryChip';

interface Props {
  categories: OfferCategory[];
  selected: OfferCategory[];
  onChange: (cats: OfferCategory[]) => void;
}

export function CategoryFilter({ categories, selected, onChange }: Props) {
  const toggle = (cat: OfferCategory) => {
    if (selected.includes(cat)) {
      onChange(selected.filter(c => c !== cat));
    } else {
      onChange([...selected, cat]);
    }
  };

  return (
    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
      <Typography variant="caption" color="text.secondary" fontWeight={600} mr={0.5}>
        Categorias:
      </Typography>
      {categories.map(cat => (
        <CategoryChip
          key={cat}
          category={cat}
          onClick={() => toggle(cat)}
          selected={selected.includes(cat)}
        />
      ))}
      {selected.length > 0 && (
        <Tooltip title="Limpar filtros">
          <IconButton size="small" onClick={() => onChange([])} sx={{ color: 'text.disabled', '&:hover': { color: 'text.primary' } }}>
            <CleaningServicesIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );
}
