import { Box, Card, CardActionArea, CardContent, Chip, Typography } from '@mui/material';
import { Cloud as CloudIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import type { Provider } from '../../../../types';

interface Props {
  provider: Provider;
  offerCount: number;
  onClick: () => void;
}

export function ProviderCard({ provider, offerCount, onClick }: Props) {
  return (
    <Card sx={{ height: '100%', cursor: 'pointer' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%', p: 0 }}>
        <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Icon */}
          <Box sx={{ width: 52, height: 52, flexShrink: 0 }}>
            {provider.logoUrl ? (
              <img
                src={provider.logoUrl}
                alt={provider.shortName}
                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: `${provider.accentColor}15`,
                  border: `1.5px solid ${provider.accentColor}30`,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloudIcon sx={{ color: provider.accentColor, fontSize: 28 }} />
              </Box>
            )}
          </Box>

          <Box flex={1}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <Typography variant="h6" fontWeight={700} color="text.primary">{provider.name}</Typography>
            </Box>
            <Chip
              label={provider.shortName}
              size="small"
              sx={{
                backgroundColor: `${provider.accentColor}15`,
                color: provider.accentColor,
                fontWeight: 700,
                fontSize: '0.7rem',
                mb: 1,
              }}
            />
            <Typography variant="body2" color="text.secondary">{provider.description}</Typography>
          </Box>

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="caption" fontWeight={600} color="text.secondary">
              {offerCount} {offerCount === 1 ? 'oferta disponível' : 'ofertas disponíveis'}
            </Typography>
            <ArrowForwardIcon sx={{ color: provider.accentColor, fontSize: 18 }} />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
