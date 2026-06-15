import { Alert, Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '../../../../hooks/useProviders';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import { ProviderCard } from './ProviderCard';

export function MarketplacePage() {
  const { providers, loading, error } = useProviders();
  const navigate = useNavigate();
  const { client } = useMarketplaceClient();
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (providers.length === 0) return;
    Promise.all(providers.map(p => client.getOffers(p.id).then(offers => [p.id, offers.length] as const)))
      .then(entries => setOfferCounts(Object.fromEntries(entries)));
  }, [client, providers]);

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
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
          Cloud Marketplace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Selecione um provider para explorar os recursos disponíveis.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {providers.map(provider => (
          <Grid item xs={12} sm={6} md={4} key={provider.id}>
            <ProviderCard
              provider={provider}
              offerCount={offerCounts[provider.id] ?? 0}
              onClick={() => navigate(`/cloud-marketplace/${provider.id}`)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
