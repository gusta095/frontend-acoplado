import { Box, Button, Chip, Grid, Paper, Typography } from '@mui/material';
import {
  Cloud as CloudIcon,
  Storage as StorageIcon,
  Settings as SettingsIcon,
  ArrowForward as ArrowForwardIcon,
  Inventory2Outlined as InventoryIcon,
  StorefrontOutlined as StorefrontIcon,
  ShoppingCartOutlined as CartIcon,
  CheckCircleOutline as CheckCircleIcon,
} from '@mui/icons-material';
import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useOnPremiseCart } from '../../context/OnPremiseCartContext';
import { useDeploymentHistory } from '../../context/DeploymentHistoryContext';
import { useOnPremiseDeploymentHistory } from '../../context/OnPremiseDeploymentHistoryContext';
import { useTemplateSource } from '../../context/TemplateSourceContext';
import { useOnPremiseSource } from '../../context/OnPremiseSourceContext';

const USER_NAME = 'Gustavo';

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <Paper
      variant="outlined"
      sx={{ px: 2.5, py: 2, borderRadius: 2, borderColor: '#E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}
    >
      <Box sx={{ width: 40, height: 40, borderRadius: 1.5, backgroundColor: 'rgba(0,48,135,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </Box>
      <Box>
        <Typography variant="h6" fontWeight={800} color="text.primary" lineHeight={1}>{value}</Typography>
        <Typography variant="caption" color="text.secondary" lineHeight={1.3} display="block">{label}</Typography>
      </Box>
    </Paper>
  );
}

const modules = [
  {
    icon: <CloudIcon sx={{ fontSize: 36 }} />,
    title: 'Cloud Marketplace',
    description: 'Provisione recursos AWS, Azure e OCI com poucos cliques.',
    to: '/cloud-marketplace',
    active: true,
  },
  {
    icon: <StorageIcon sx={{ fontSize: 36 }} />,
    title: 'On-Premise Marketplace',
    description: 'Provisione VMs e recursos em infraestrutura local com VMware, Proxmox e Bare Metal.',
    to: '/on-premise',
    active: true,
  },
  {
    icon: <SettingsIcon sx={{ fontSize: 36 }} />,
    title: 'Configurações',
    description: 'Cadastros, integrações e permissões.',
    to: null,
    active: false,
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const { items: cloudItems } = useCart();
  const { items: onPremiseItems } = useOnPremiseCart();
  const { batches: cloudBatches } = useDeploymentHistory();
  const { batches: onPremiseBatches } = useOnPremiseDeploymentHistory();
  const { cloudClient } = useTemplateSource();
  const { onPremiseClient } = useOnPremiseSource();

  const [cloudProviderCount, setCloudProviderCount] = useState<number | null>(null);
  const [cloudOfferCount, setCloudOfferCount] = useState<number | null>(null);
  const [onPremiseProviderCount, setOnPremiseProviderCount] = useState<number | null>(null);
  const [onPremiseOfferCount, setOnPremiseOfferCount] = useState<number | null>(null);

  useEffect(() => {
    setCloudProviderCount(null);
    setCloudOfferCount(null);
    cloudClient.getProviders().then(ps => setCloudProviderCount(ps.length));
    cloudClient.getAllOffers().then(os => setCloudOfferCount(os.length));
  }, [cloudClient]);

  useEffect(() => {
    setOnPremiseProviderCount(null);
    setOnPremiseOfferCount(null);
    onPremiseClient.getProviders().then(ps => setOnPremiseProviderCount(ps.length));
    onPremiseClient.getAllOffers().then(os => setOnPremiseOfferCount(os.length));
  }, [onPremiseClient]);

  const cloudProvisionCount = cloudBatches.reduce((sum, b) =>
    sum + b.results.filter(r => r.response.status === 'accepted').length, 0
  );
  const onPremiseProvisionCount = onPremiseBatches.reduce((sum, b) =>
    sum + b.results.filter(r => r.response.status === 'accepted').length, 0
  );

  const fmt = (v: number | null) => v !== null ? String(v) : '…';

  const cloudStats = [
    { icon: <StorefrontIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Providers', value: fmt(cloudProviderCount) },
    { icon: <InventoryIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Ofertas', value: fmt(cloudOfferCount) },
    { icon: <CartIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'No carrinho', value: String(cloudItems.length) },
    { icon: <CheckCircleIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Provisionamentos', value: String(cloudProvisionCount) },
  ];

  const onPremiseStats = [
    { icon: <StorefrontIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Providers', value: fmt(onPremiseProviderCount) },
    { icon: <InventoryIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Ofertas', value: fmt(onPremiseOfferCount) },
    { icon: <CartIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'No carrinho', value: String(onPremiseItems.length) },
    { icon: <CheckCircleIcon sx={{ fontSize: 22, color: '#003087' }} />, label: 'Provisionamentos', value: String(onPremiseProvisionCount) },
  ];

  return (
    <Box>
      {/* Hero */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #001f5c 0%, #003087 55%, #0050B3 100%)',
          px: { xs: 3, md: 6 },
          py: { xs: 5, md: 6 },
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: -80,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          },
          '&::after': {
            content: '""',
            position: 'absolute',
            bottom: -120,
            right: 120,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.03)',
            pointerEvents: 'none',
          },
        }}
      >
        <Typography
          variant="overline"
          sx={{ color: 'rgba(255,255,255,0.55)', letterSpacing: 3, fontSize: '0.7rem', fontWeight: 600 }}
        >
          Portal de Engenharia
        </Typography>

        <Typography
          variant="h4"
          fontWeight={800}
          color="#fff"
          mt={0.5}
          mb={1}
          sx={{ lineHeight: 1.2 }}
        >
          Bem-vindo de volta,{' '}
          <Box component="span" sx={{ color: 'rgba(255,255,255,0.75)' }}>
            {USER_NAME}.
          </Box>
        </Typography>

        <Typography
          variant="body1"
          sx={{ color: 'rgba(255,255,255,0.6)', maxWidth: 480, lineHeight: 1.6 }}
        >
          Seu portal self-service para provisionamento de infraestrutura cloud.
          Configure, solicite e acompanhe recursos em minutos.
        </Typography>
      </Box>

      <Box px={{ xs: 3, md: 6 }} py={5}>
        {/* Módulos */}
        <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, fontSize: '0.7rem', fontWeight: 700 }}>
          Módulos
        </Typography>

        <Grid container spacing={2.5} mt={0.5} mb={5}>
          {modules.map((mod) => (
            <Grid item xs={12} sm={6} md={4} key={mod.title}>
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 2.5,
                  borderColor: mod.active ? '#003087' : '#E2E8F0',
                  borderWidth: mod.active ? 1.5 : 1,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                  transition: 'box-shadow 0.18s, border-color 0.18s',
                  ...(mod.active && {
                    '&:hover': {
                      boxShadow: '0 4px 20px rgba(0,48,135,0.12)',
                    },
                  }),
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    background: mod.active
                      ? 'linear-gradient(135deg, #003087 0%, #0050B3 100%)'
                      : '#F7FAFC',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: mod.active ? '#fff' : '#A0AEC0',
                  }}
                >
                  {mod.icon}
                </Box>

                <Box flex={1}>
                  <Box display="flex" alignItems="center" gap={1} mb={0.75}>
                    <Typography variant="body1" fontWeight={700} color={mod.active ? 'text.primary' : 'text.disabled'}>
                      {mod.title}
                    </Typography>
                    {!mod.active && (
                      <Chip
                        label="Em breve"
                        size="small"
                        sx={{ fontSize: '0.65rem', height: 18, backgroundColor: '#EDF2F7', color: '#718096' }}
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                    {mod.description}
                  </Typography>
                </Box>

                {mod.active ? (
                  <Button
                    variant="contained"
                    endIcon={<ArrowForwardIcon />}
                    onClick={() => navigate(mod.to!)}
                    sx={{ alignSelf: 'flex-start' }}
                    size="small"
                  >
                    Acessar
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled
                    sx={{ alignSelf: 'flex-start', borderColor: '#E2E8F0', color: '#CBD5E0' }}
                  >
                    Acessar
                  </Button>
                )}
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Estatísticas */}
        <Box display="flex" alignItems="center" gap={1} mt={0} mb={1}>
          <CloudIcon sx={{ fontSize: 16, color: '#003087' }} />
          <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, fontSize: '0.7rem', fontWeight: 700 }}>
            Cloud
          </Typography>
        </Box>
        <Grid container spacing={2} mb={3}>
          {cloudStats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>

        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <StorageIcon sx={{ fontSize: 16, color: '#003087' }} />
          <Typography variant="overline" sx={{ color: 'text.disabled', letterSpacing: 2, fontSize: '0.7rem', fontWeight: 700 }}>
            On-Premise
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {onPremiseStats.map((stat) => (
            <Grid item xs={6} md={3} key={stat.label}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
