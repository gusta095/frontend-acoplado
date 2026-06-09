import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, Grid, TextField, Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocationOn as LocationIcon,
  Inventory2Outlined as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { useDeploymentHistory } from '../../../../context/DeploymentHistoryContext';
import { useTemplateSource } from '../../../../context/TemplateSourceContext';
import { CLOUD_PROVIDERS } from '../../../../api/cloudProviders';
import type { CartItem, ProviderId } from '../../../../types';

const PROVIDER_FIELDS: Partial<Record<ProviderId, { key: string; label: string }[]>> = {
  aws:   [{ key: 'account_id',   label: 'Account ID'   }, { key: 'region', label: 'Region' }],
  azure: [{ key: 'subscription', label: 'Subscription' }, { key: 'region', label: 'Region' }],
  oci:   [{ key: 'compartment',  label: 'Compartment'  }, { key: 'region', label: 'Region' }],
};

const fadeIn = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

function getProvider(providerId: ProviderId) {
  return CLOUD_PROVIDERS.find(p => p.id === providerId);
}

function groupByOffer(items: CartItem[]) {
  const map = new Map<string, { name: string; providerId: ProviderId; count: number }>();
  for (const item of items) {
    const existing = map.get(item.offer.id);
    if (existing) existing.count++;
    else map.set(item.offer.id, { name: item.offer.name, providerId: item.offer.providerId, count: 1 });
  }
  return Array.from(map.values());
}

interface DestinationSectionProps {
  items: CartItem[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

function DestinationSection({ items, values, onChange }: DestinationSectionProps) {
  const first = items[0];
  const fields = PROVIDER_FIELDS[first.offer.providerId] ?? [];
  if (fields.length === 0) return null;

  const provider = getProvider(first.offer.providerId);

  return (
    <Box
      sx={{
        bgcolor: '#F0F7FF',
        border: '1px solid #BFDBFE',
        borderRadius: 3,
        p: 2.5,
        animation: 'fadeSlideUp 0.35s ease both',
        animationDelay: '0ms',
      }}
    >
      <Box display="flex" alignItems="center" gap={1} mb={2.5}>
        <LocationIcon sx={{ fontSize: 16, color: '#0050B3' }} />
        <Typography variant="caption" fontWeight={700} color="#0050B3" sx={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
          Destino do provisionamento
        </Typography>
        {provider && (
          <Chip
            label={provider.shortName}
            size="small"
            sx={{
              ml: 'auto',
              bgcolor: `${provider.accentColor}18`,
              color: provider.accentColor,
              fontWeight: 700,
              fontSize: '0.65rem',
              border: `1px solid ${provider.accentColor}35`,
            }}
          />
        )}
      </Box>

      <Grid container spacing={2}>
        {fields.map(({ key, label }) => (
          <Grid item xs={12} sm={6} key={key}>
            <TextField
              label={label}
              value={values[key] ?? ''}
              onChange={e => onChange(key, e.target.value)}
              fullWidth
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#fff',
                  '& fieldset': { borderColor: '#BFDBFE' },
                  '&:hover fieldset': { borderColor: '#0050B3' },
                  '&.Mui-focused fieldset': { borderColor: '#0050B3' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#0050B3' },
              }}
            />
          </Grid>
        ))}
      </Grid>

      <Typography variant="caption" color="#64748B" display="block" mt={2}>
        Todos os recursos abaixo serão provisionados neste destino.
      </Typography>
    </Box>
  );
}

interface ItemCardProps {
  item: CartItem;
  index: number;
  disabled: boolean;
  onEdit: (item: CartItem) => void;
  onRemove: (id: string) => void;
}

function ItemCard({ item, index, disabled, onEdit, onRemove }: ItemCardProps) {
  const provider = getProvider(item.offer.providerId);
  const destinationKeys = new Set((PROVIDER_FIELDS[item.offer.providerId] ?? []).map(f => f.key));
  const params = Object.entries(item.parameters).filter(([k]) => !destinationKeys.has(k));

  return (
    <Card
      elevation={0}
      sx={{
        border: '1px solid #E2ECF6',
        borderRadius: 3,
        transition: 'opacity 0.3s',
        opacity: disabled ? 0.55 : 1,
        animation: 'fadeSlideUp 0.35s ease both',
        animationDelay: `${(index + 1) * 80}ms`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={params.length > 0 ? 2 : 0}>
          <Box display="flex" alignItems="center" gap={1.5}>
            {provider?.logoUrl && (
              <Box
                component="img"
                src={provider.logoUrl}
                alt={provider.shortName}
                sx={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0, display: 'block' }}
              />
            )}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>
                {item.offer.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
                {item.offer.shortDescription}
              </Typography>
            </Box>
          </Box>
          {provider && (
            <Chip
              label={provider.shortName}
              size="small"
              sx={{
                bgcolor: `${provider.accentColor}18`,
                color: provider.accentColor,
                fontWeight: 700,
                fontSize: '0.68rem',
                border: `1px solid ${provider.accentColor}35`,
                flexShrink: 0,
              }}
            />
          )}
        </Box>

        {params.length > 0 && (
          <Box display="flex" flexWrap="wrap" gap={0.75} mb={2}>
            {params.map(([key, value]) => {
              const paramDef = item.offer.parameters.find(p => p.key === key);
              return (
                <Chip
                  key={key}
                  label={`${paramDef?.label ?? key}: ${String(value)}`}
                  size="small"
                  sx={{ bgcolor: '#F1F5F9', color: '#475569', fontSize: '0.7rem', borderRadius: 1 }}
                />
              );
            })}
          </Box>
        )}

        <Box display="flex" justifyContent="flex-end" gap={1} mt={params.length === 0 ? 2 : 0}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<EditIcon fontSize="small" />}
            disabled={disabled}
            onClick={() => onEdit(item)}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary', fontSize: '0.75rem' }}
          >
            Editar
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<DeleteIcon fontSize="small" />}
            disabled={disabled}
            onClick={() => onRemove(item.id)}
            sx={{ borderColor: '#FECACA', color: '#EF4444', fontSize: '0.75rem', '&:hover': { bgcolor: '#FEF2F2', borderColor: '#EF4444' } }}
          >
            Excluir
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}

export function CheckoutReviewPage() {
  const navigate = useNavigate();
  const { items, removeItem } = useCart();
  const { addBatch } = useDeploymentHistory();
  const { cloudClient } = useTemplateSource();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const isEditingRef = useRef(false);
  const [destination, setDestination] = useState<Record<string, string>>(() => {
    if (items.length === 0) return {};
    const fields = PROVIDER_FIELDS[items[0].offer.providerId] ?? [];
    return Object.fromEntries(fields.map(f => [f.key, String(items[0].parameters[f.key] ?? '')]));
  });

  useEffect(() => {
    if (items.length === 0 && !isEditingRef.current) navigate('/cloud-marketplace');
  }, [items.length, navigate]);

  const byOffer = groupByOffer(items);

  const handleDestinationChange = (key: string, value: string) => {
    setDestination(prev => ({ ...prev, [key]: value }));
  };

  const handleEdit = (item: CartItem) => {
    isEditingRef.current = true;
    removeItem(item.id);
    const editValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(item.parameters)) editValues[k] = String(v);
    navigate(`/cloud-marketplace/${item.offer.providerId}/${item.offer.id}/provision`, {
      state: { editValues, returnTo: '/checkout/review' },
    });
  };

  const handleConfirm = async () => {
    const currentItems = [...items];
    const batchId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    setIsProvisioning(true);

    const responses: Awaited<ReturnType<typeof cloudClient.provision>>[] = [];
    for (const item of currentItems) {
      responses.push(await cloudClient.provision({
        offerId: item.offer.id,
        providerId: item.offer.providerId,
        parameters: { ...item.parameters, ...destination },
      }));
    }

    currentItems.forEach((item, i) => {
      if (responses[i].status === 'accepted') removeItem(item.id);
    });

    addBatch({
      batchId,
      timestamp,
      snapshot: currentItems,
      results: currentItems.map((item, i) => ({ itemId: item.id, response: responses[i] })),
    });

    setIsProvisioning(false);
    navigate(`/deployments/${batchId}`);
  };

  if (items.length === 0) return null;

  return (
    <>
      <style>{fadeIn}</style>
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 5 }, py: 4 }}>

        {/* Page header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ color: 'text.secondary', mb: 2, pl: 0, '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
          >
            Voltar ao carrinho
          </Button>

          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 36, height: 36, borderRadius: 2,
                background: 'linear-gradient(135deg, #003087 0%, #0050B3 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              <InventoryIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="text.primary" lineHeight={1.1}>
                Revisão do pedido
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.25}>
                Confira os recursos abaixo antes de confirmar o provisionamento.
              </Typography>
            </Box>
          </Box>
        </Box>

        <Grid container spacing={3} alignItems="flex-start">
          {/* Left — destino + lista de itens */}
          <Grid item xs={12} md={8}>
            <Box display="flex" flexDirection="column" gap={2}>
              <DestinationSection items={items} values={destination} onChange={handleDestinationChange} />
              {items.map((item, i) => (
                <ItemCard key={item.id} item={item} index={i} disabled={isProvisioning} onEdit={handleEdit} onRemove={removeItem} />
              ))}
            </Box>
          </Grid>

          {/* Right — resumo */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={0}
              sx={{
                border: '1px solid #E2ECF6',
                borderRadius: 3,
                position: { md: 'sticky' },
                top: { md: 80 },
                animation: 'fadeSlideUp 0.4s ease both',
                animationDelay: `${(items.length + 1) * 80}ms`,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} color="text.primary" mb={2}>
                  Resumo
                </Typography>

                <Box display="flex" flexDirection="column" gap={1} mb={2.5}>
                  {byOffer.map(({ name, providerId, count }) => {
                    const prov = getProvider(providerId);
                    return (
                      <Box key={name} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
                          {prov?.logoUrl && (
                            <Box component="img" src={prov.logoUrl} alt={prov.shortName}
                              sx={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                          )}
                          <Typography variant="body2" color="text.secondary" noWrap>{name}</Typography>
                        </Box>
                        <Typography variant="body2" fontWeight={600} color="text.primary" flexShrink={0}>
                          {count} {count === 1 ? 'recurso' : 'recursos'}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                <Divider sx={{ borderColor: '#E2ECF6', mb: 2.5 }} />

                <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
                  <Typography variant="body2" color="text.secondary">Total</Typography>
                  <Typography variant="subtitle1" fontWeight={800} color="primary.main">
                    {items.length} {items.length === 1 ? 'recurso' : 'recursos'}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={isProvisioning}
                  onClick={handleConfirm}
                  startIcon={isProvisioning
                    ? <CircularProgress size={16} color="inherit" />
                    : <CheckCircleIcon />
                  }
                  sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, mb: 1.5 }}
                >
                  {isProvisioning ? 'Provisionando...' : 'Provisionar'}
                </Button>

                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mb={1.5}>
                  Os recursos serão criados automaticamente após a confirmação.
                </Typography>

                <Button
                  variant="text"
                  fullWidth
                  disabled={isProvisioning}
                  onClick={() => navigate(-1)}
                  sx={{ color: 'text.secondary' }}
                >
                  Voltar
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
