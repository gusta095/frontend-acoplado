import { Box, Chip, Divider, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import { DeleteOutline as DeleteOutlineIcon, CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import type { CartItem, ProvisioningResponse } from '../../types';
import { ProviderBadge } from '../shared/ProviderBadge';

interface Props {
  item: CartItem;
  onRemove: (id: string) => void;
  result?: ProvisioningResponse;
}

export function CartItemCard({ item, onRemove, result }: Props) {
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
                label={`${key}: ${val}`}
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

        {!result && (
          <Tooltip title="Remover">
            <IconButton size="small" onClick={() => onRemove(item.id)} sx={{ color: '#A0AEC0', '&:hover': { color: '#E53E3E' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}

        {result && (
          result.status === 'accepted'
            ? <CheckCircleIcon sx={{ color: '#48BB78', fontSize: 20 }} />
            : <ErrorIcon sx={{ color: '#FC8181', fontSize: 20 }} />
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
    </Paper>
  );
}
