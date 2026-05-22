import { Box, Card, CardActionArea, CardContent, Typography } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import type { Offer } from '../../../../types';
import { CategoryChip } from '../CategoryChip';
import { ProviderBadge } from '../ProviderBadge';

interface Props {
  offer: Offer;
  onClick: () => void;
}

export function OfferCard({ offer, onClick }: Props) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardActionArea onClick={onClick} sx={{ height: '100%' }}>
        <CardContent sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={1}>
            <Typography variant="body1" fontWeight={700} color="text.primary" lineHeight={1.3}>
              {offer.name}
            </Typography>
            <ProviderBadge provider={offer.providerId} />
          </Box>

          <Typography variant="body2" color="text.secondary" flex={1} sx={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            {offer.shortDescription}
          </Typography>

          <Box display="flex" alignItems="center" justifyContent="space-between">
            <CategoryChip category={offer.category} />
            {offer.estimatedDuration && (
              <Box display="flex" alignItems="center" gap={0.5}>
                <AccessTimeIcon sx={{ fontSize: 12, color: '#A0AEC0' }} />
                <Typography variant="caption" color="text.disabled">{offer.estimatedDuration}</Typography>
              </Box>
            )}
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
