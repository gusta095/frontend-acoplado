import { Box, CircularProgress, Grid, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useProviders } from '../../hooks/useProviders';
import mockData from '../../mocks/offers.mock.json';
import { ProviderCard } from './ProviderCard';

export function MarketplacePage() {
  const { providers, loading } = useProviders();
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
              offerCount={getOfferCount(provider.id)}
              onClick={() => navigate(`/cloud-marketplace/${provider.id}`)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
