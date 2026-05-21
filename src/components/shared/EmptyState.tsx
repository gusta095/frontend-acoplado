import { Box, Typography } from '@mui/material';
import { SearchOff as SearchOffIcon } from '@mui/icons-material';

interface Props {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptyState({ title = 'Nenhum resultado', description = 'Tente ajustar os filtros ou a busca.', icon }: Props) {
  return (
    <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" py={8} gap={2}>
      <Box sx={{ color: '#CBD5E0', fontSize: 64 }}>
        {icon ?? <SearchOffIcon sx={{ fontSize: 64 }} />}
      </Box>
      <Typography variant="h6" color="text.secondary" fontWeight={600}>{title}</Typography>
      <Typography variant="body2" color="text.disabled" textAlign="center" maxWidth={320}>{description}</Typography>
    </Box>
  );
}
