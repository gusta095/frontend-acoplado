import { Box, Button, Chip, Divider, Paper, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import type { CartItem, ProvisioningResponse } from '../../../../types';
import { ProviderBadge } from '../ProviderBadge';

interface Props {
  item: CartItem;
  onRemove: (id: string) => void;
  onEdit?: (item: CartItem) => void;
  removable?: boolean;
  result?: ProvisioningResponse;
}

export function CartItemCard({ item, onRemove, onEdit, removable = true, result }: Props) {
  const labelMap = Object.fromEntries(item.offer.parameters.map(p => [p.key, p.label]));

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        borderColor: result
          ? result.status === 'accepted' ? '#48BB78' : '#FC8181'
          : '#E2E8F0',
        backgroundColor: result
          ? result.status === 'accepted' ? '#F0FFF4' : '#FFF5F5'
          : '#fff',
      }}
    >
      <Box display="flex" alignItems="flex-start" gap={1}>
        <Box flex={1}>
          <Box display="flex" alignItems="center" gap={1} mb={0.5}>
            <Typography variant="body2" fontWeight={700} color="text.primary">{item.offer.name}</Typography>
            <ProviderBadge provider={item.offer.providerId} />
          </Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
            {item.offer.shortDescription}
          </Typography>

          <Box display="flex" flexWrap="wrap" gap={0.5}>
            {Object.entries(item.parameters).slice(0, 4).map(([key, val]) => (
              <Chip
                key={key}
                label={`${labelMap[key] ?? key}: ${val}`}
                size="small"
                sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#EDF2F7', color: '#4A5568' }}
              />
            ))}
            {Object.keys(item.parameters).length > 4 && (
              <Chip label={`+${Object.keys(item.parameters).length - 4}`} size="small"
                sx={{ fontSize: '0.65rem', height: 20, backgroundColor: '#EDF2F7', color: '#718096' }} />
            )}
          </Box>
        </Box>

        {result && (
          result.status === 'accepted'
            ? <CheckCircleIcon sx={{ color: '#48BB78', fontSize: 20, flexShrink: 0 }} />
            : <ErrorIcon sx={{ color: '#FC8181', fontSize: 20, flexShrink: 0 }} />
        )}
      </Box>

      {result && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="caption" color={result.status === 'accepted' ? 'success.main' : 'error.main'} fontWeight={600}>
            {result.message}
          </Typography>
          {result.requestId && (
            <Typography variant="caption" color="text.disabled" display="block">ID: {result.requestId}</Typography>
          )}
        </>
      )}

      {removable && !result && (
        <>
          <Divider sx={{ mt: 1.5, mb: 1, borderColor: '#F0F4F8' }} />
          <Box display="flex" gap={1}>
            <Button
              size="small"
              variant="outlined"
              onClick={() => onEdit?.(item)}
              sx={{
                fontSize: '0.75rem',
                py: 0.25,
                borderColor: '#E2E8F0',
                color: 'text.secondary',
                '&:hover': { borderColor: '#003087', color: '#003087' },
              }}
            >
              Editar
            </Button>
            <Button
              size="small"
              onClick={() => onRemove(item.id)}
              sx={{
                fontSize: '0.75rem',
                py: 0.25,
                color: '#A0AEC0',
                '&:hover': { color: '#E53E3E', backgroundColor: '#FFF5F5' },
              }}
            >
              Excluir
            </Button>
          </Box>
        </>
      )}
    </Paper>
  );
}
