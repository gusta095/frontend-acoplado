import { Alert, Box, Breadcrumbs, CircularProgress, Grid, Link, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOffers } from '../../../../hooks/useOffers';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import type { OfferCategory, ProviderId } from '../../../../types';
import { PROVIDER_NAMES } from '../../../../constants/providers';
import { EmptyState } from '../EmptyState';
import { CategoryFilter } from './CategoryFilter';
import { OfferCard } from './OfferCard';

export function OffersPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { basePath, marketplaceName } = useMarketplaceClient();
  const [selectedCategories, setSelectedCategories] = useState<OfferCategory[]>([]);

  const { offers, loading, error } = useOffers(providerId as ProviderId);

  const allCategories = [...new Set(offers.map(o => o.category))];

  const filtered = selectedCategories.length === 0
    ? offers
    : offers.filter(o => selectedCategories.includes(o.category));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress sx={{ color: '#003087' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert severity="error" sx={{ whiteSpace: 'pre-line' }}>{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          underline="hover"
          color="text.secondary"
          sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(basePath)}
        >
          {marketplaceName}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={600}>
          {PROVIDER_NAMES[providerId ?? ''] ?? providerId}
        </Typography>
      </Breadcrumbs>

      <Box mb={3}>
        <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
          {PROVIDER_NAMES[providerId ?? ''] ?? providerId}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {offers.length} {offers.length === 1 ? 'oferta disponível' : 'ofertas disponíveis'}
        </Typography>
      </Box>

      {allCategories.length > 0 && (
        <Box mb={3}>
          <CategoryFilter
            categories={allCategories}
            selected={selectedCategories}
            onChange={setSelectedCategories}
          />
        </Box>
      )}

      {filtered.length === 0 ? (
        <EmptyState title="Nenhuma oferta encontrada" description="Tente remover algum filtro de categoria." />
      ) : (
        <Grid container spacing={2.5}>
          {filtered.map(offer => (
            <Grid item xs={12} sm={6} md={4} key={offer.id}>
              <OfferCard
                offer={offer}
                onClick={() => navigate(`${basePath}/${providerId}/${offer.id}`)}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
