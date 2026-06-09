import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '../../../../hooks/useProviders';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import type { Provider } from '../../../../types';
import { ProviderCard } from './ProviderCard';

export function OnPremiseMarketplacePage() {
  const { providers, loading } = useProviders();
  const { client, basePath } = useMarketplaceClient();
  const navigate = useNavigate();
  const [offerCounts, setOfferCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!providers.length) return;
    Promise.all(
      providers.map(p => client.getOffers(p.id).then(offers => ({ id: p.id, count: offers.length })))
    ).then(results => {
      setOfferCounts(Object.fromEntries(results.map(r => [r.id, r.count])));
    });
  }, [client, providers]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress sx={{ color: '#003087' }} />
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box mb={4}>
        <Typography variant="h4" fontWeight={800} color="text.primary" gutterBottom>
          On-Premise Marketplace
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Selecione um hypervisor para explorar os recursos disponíveis no ambiente on-premise.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {providers.map((provider: Provider) => (
          <Grid item xs={12} sm={6} md={4} key={provider.id}>
            <ProviderCard
              provider={provider}
              offerCount={offerCounts[provider.id] ?? 0}
              onClick={() => navigate(`${basePath}/${provider.id}`)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
