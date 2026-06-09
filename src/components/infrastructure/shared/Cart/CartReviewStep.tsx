import { Box, Button, Chip, Divider, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon, CheckCircleOutline as CheckIcon } from '@mui/icons-material';
import type { CartItem } from '../../../../types';
import type { ProviderId } from '../../../../types';

interface ProviderFieldDef {
  key: string;
  label: string;
}

const PROVIDER_FIELDS: Record<ProviderId, ProviderFieldDef[]> = {
  aws: [
    { key: 'account_id', label: 'Account ID' },
    { key: 'region', label: 'Region' },
  ],
  azure: [
    { key: 'subscription', label: 'Subscription' },
    { key: 'region', label: 'Region' },
  ],
  oci: [
    { key: 'compartment', label: 'Compartment' },
    { key: 'region', label: 'Region' },
  ],
  vmware: [],
  proxmox: [],
  baremetal: [],
};

interface Props {
  items: CartItem[];
  onBack: () => void;
  onConfirm: () => void;
}

export function CartReviewStep({ items, onBack, onConfirm }: Props) {
  return (
    <Box display="flex" flexDirection="column" height="100%">
      {/* Review header */}
      <Box px={2.5} pt={2.5} pb={2}>
        <Box display="flex" alignItems="center" gap={1.5} mb={0.5}>
          <CheckIcon sx={{ color: 'primary.main', fontSize: 22 }} />
          <Typography variant="h6" fontWeight={700} color="text.primary">
            Revise seu pedido
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Confira os dados abaixo antes de confirmar o provisionamento.
        </Typography>
      </Box>

      <Divider sx={{ borderColor: '#E2E8F0' }} />

      {/* Items */}
      <Box flex={1} overflow="auto" px={2.5} py={2} display="flex" flexDirection="column" gap={2}>
        {items.map((item, index) => {
          const fields = PROVIDER_FIELDS[item.offer.providerId] ?? [];
          const allParams = item.parameters;

          return (
            <Box key={item.id}>
              {index > 0 && <Divider sx={{ borderColor: '#E2E8F0', mb: 2 }} />}

              {/* Item header */}
              <Box display="flex" alignItems="center" gap={1} mb={1.5}>
                <Typography variant="body1" fontWeight={700} color="text.primary">
                  {item.offer.name}
                </Typography>
                <Chip
                  label={item.offer.providerId.toUpperCase()}
                  size="small"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    height: 18,
                    bgcolor: '#F0F4FF',
                    color: 'primary.main',
                  }}
                />
              </Box>

              {/* Provider-specific fields */}
              {fields.length > 0 && (
                <Box
                  sx={{
                    bgcolor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 2,
                    p: 2,
                    mb: 1.5,
                  }}
                >
                  <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Destino do provisionamento
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1} mt={1}>
                    {fields.map(({ key, label }) => (
                      <Box key={key} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">{label}</Typography>
                        <Typography variant="body2" fontWeight={600} color="text.primary">
                          {allParams[key] != null ? String(allParams[key]) : <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>não informado</span>}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Other params */}
              <Box display="flex" flexWrap="wrap" gap={0.75}>
                {Object.entries(allParams)
                  .filter(([key]) => !fields.some(f => f.key === key))
                  .map(([key, value]) => {
                    const paramDef = item.offer.parameters.find(p => p.key === key);
                    const label = paramDef?.label ?? key;
                    return (
                      <Chip
                        key={key}
                        label={`${label}: ${String(value)}`}
                        size="small"
                        sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: '0.7rem' }}
                      />
                    );
                  })}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Footer */}
      <Divider sx={{ borderColor: '#E2E8F0' }} />
      <Box p={2} display="flex" flexDirection="column" gap={1.5}>
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Ao confirmar, os recursos serão provisionados automaticamente.
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            onClick={onBack}
            startIcon={<ArrowBackIcon />}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary', flexShrink: 0 }}
          >
            Voltar
          </Button>
          <Button variant="contained" fullWidth size="large" onClick={onConfirm}>
            Confirmar {items.length} {items.length === 1 ? 'pedido' : 'pedidos'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
