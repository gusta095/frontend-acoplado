import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '../../../../hooks/useProviders';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import mockData from '../../../../mocks/onpremise.mock.json';
import { ProviderCard } from './ProviderCard';

export function OnPremiseMarketplacePage() {
  const { providers, loading } = useProviders();
  const { basePath } = useMarketplaceClient();
  const navigate = useNavigate();

  const getOfferCount = (providerId: string) =>
    mockData.offers.filter(o => o.providerId === providerId).length;

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
          On-Premise
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Selecione um hypervisor para explorar os recursos disponíveis no ambiente on-premise.
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {providers.map(provider => (
          <Grid item xs={12} sm={6} md={4} key={provider.id}>
            <ProviderCard
              provider={provider}
              offerCount={getOfferCount(provider.id)}
              onClick={() => navigate(`${basePath}/${provider.id}`)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
