import { Box, Breadcrumbs, Button, CircularProgress, Divider, Link, Paper, Typography } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { OpenInNew as OpenInNewIcon } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useOfferDetail } from '../../../../hooks/useOfferDetail';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import { PROVIDER_NAMES } from '../../../../constants/providers';
import { CategoryChip } from '../CategoryChip';
import { ProviderBadge } from '../ProviderBadge';
import { ParameterList } from './ParameterList';

export function OfferDetailPage() {
  const { providerId, offerId } = useParams<{ providerId: string; offerId: string }>();
  const navigate = useNavigate();
  const { basePath, marketplaceName } = useMarketplaceClient();
  const { offer, loading } = useOfferDetail(offerId ?? '');

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress sx={{ color: '#003087' }} />
      </Box>
    );
  }

  if (!offer) return null;

  return (
    <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 5 }, py: 4 }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(basePath)}>
          {marketplaceName}
        </Link>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(`${basePath}/${providerId}`)}>
          {PROVIDER_NAMES[providerId ?? ''] ?? providerId}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={600}>{offer.name}</Typography>
      </Breadcrumbs>

      <Box sx={{ maxWidth: 860, mx: 'auto' }}>

      {/* Header */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>{offer.name}</Typography>
            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
              <ProviderBadge provider={offer.providerId} size="medium" />
              <CategoryChip category={offer.category} />
              {offer.estimatedDuration && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <AccessTimeIcon sx={{ fontSize: 14, color: '#A0AEC0' }} />
                  <Typography variant="caption" color="text.secondary">{offer.estimatedDuration}</Typography>
                </Box>
              )}
            </Box>
          </Box>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate(`${basePath}/${providerId}/${offerId}/provision`)}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            Configurar e Adicionar
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
          {offer.shortDescription}
        </Typography>
      </Paper>

      {/* Description */}
      <Box mb={3}>
        <Typography variant="h6" fontWeight={700} mb={1.5}>Sobre esta oferta</Typography>
        <Typography variant="body2" color="text.secondary" lineHeight={1.8} sx={{ whiteSpace: 'pre-line' }}>
          {offer.longDescription.replace(/^##.*$/m, '').trim()}
        </Typography>
        {offer.documentationUrl && (
          <Box mt={1.5}>
            <Link href={offer.documentationUrl} target="_blank" rel="noopener noreferrer"
              sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, fontSize: '0.875rem', color: '#003087' }}>
              Ver documentação <OpenInNewIcon sx={{ fontSize: 14 }} />
            </Link>
          </Box>
        )}
      </Box>

      {/* Parameters */}
      <Box>
        <Typography variant="h6" fontWeight={700} mb={1.5}>Parâmetros de configuração</Typography>
        <ParameterList parameters={offer.parameters} />
      </Box>
      </Box>
    </Box>
  );
}
