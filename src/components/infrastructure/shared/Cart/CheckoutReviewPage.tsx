import { useEffect, useRef, useState } from 'react';
import {
  Box, Button, Card, CardContent, Chip,
  Dialog, DialogContent, DialogTitle,
  Divider, Grid, IconButton, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Rule as RuleIcon,
  Inventory2Outlined as InventoryIcon,
  CheckCircle as CheckCircleIcon,
  EditOutlined as EditIcon,
  DeleteOutline as DeleteIcon,
  DataObject as PayloadIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { CLOUD_PROVIDERS } from '../../../../api/cloudProviders';
import type { CartItem, ProviderId } from '../../../../types';
import { BUSINESS_RULE_FIELDS, validateField, validateAllFields } from './businessRuleFields';

const fadeIn = `
  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0);    }
  }
`;

function getProvider(providerId: ProviderId) {
  return CLOUD_PROVIDERS.find(p => p.id === providerId);
}

function buildPayload(item: CartItem, destination: Record<string, string>) {
  return {
    template: `${item.offer.providerId}/${item.offer.id}`,
    payload: { ...item.parameters, ...destination },
  };
}

function buildFinalPayload(items: CartItem[], destination: Record<string, string>) {
  return {
    resources: items.map(item => buildPayload(item, destination)),
  };
}

function FinalPayloadDialog({ items, destination, open, onClose }: {
  items: CartItem[];
  destination: Record<string, string>;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(buildFinalPayload(items, destination), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PayloadIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Box>
            <Typography fontWeight={700}>Payload final</Typography>
            <Typography variant="caption" color="text.secondary">
              {items.length} {items.length === 1 ? 'recurso' : 'recursos'} · enviado em uma única requisição
            </Typography>
          </Box>
        </Box>
        <Box display="flex" gap={0.5}>
          <Tooltip title={copied ? 'Copiado!' : 'Copiar JSON'}>
            <IconButton size="small" onClick={handleCopy}>
              <CopyIcon fontSize="small" sx={{ color: copied ? '#10B981' : 'text.secondary' }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: '#0F172A',
            color: '#E2E8F0',
            borderRadius: 2,
            p: 2.5,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            overflowX: 'auto',
            lineHeight: 1.7,
            m: 0,
            maxHeight: '60vh',
            overflowY: 'auto',
          }}
        >
          {json}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function PayloadDialog({ item, destination, onClose }: { item: CartItem | null; destination: Record<string, string>; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!item) return null;

  const json = JSON.stringify(buildPayload(item, destination), null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <PayloadIcon sx={{ color: 'primary.main', fontSize: 20 }} />
          <Typography fontWeight={700}>Payload — {item.offer.name}</Typography>
        </Box>
        <Box display="flex" gap={0.5}>
          <Tooltip title={copied ? 'Copiado!' : 'Copiar JSON'}>
            <IconButton size="small" onClick={handleCopy}>
              <CopyIcon fontSize="small" sx={{ color: copied ? '#10B981' : 'text.secondary' }} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box
          component="pre"
          sx={{
            bgcolor: '#0F172A',
            color: '#E2E8F0',
            borderRadius: 2,
            p: 2.5,
            fontSize: '0.8rem',
            fontFamily: 'monospace',
            overflowX: 'auto',
            lineHeight: 1.7,
            m: 0,
          }}
        >
          {json}
        </Box>
      </DialogContent>
    </Dialog>
  );
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
  values: Record<string, string>;
  touched: Record<string, boolean>;
  onChange: (key: string, value: string) => void;
  onTouch: (key: string) => void;
}

function DestinationSection({ values, touched, onChange, onTouch }: DestinationSectionProps) {
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
        <RuleIcon sx={{ fontSize: 16, color: '#0050B3' }} />
        <Typography variant="caption" fontWeight={700} color="#0050B3" sx={{ textTransform: 'uppercase', letterSpacing: 0.7 }}>
          Regras de negócio
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {BUSINESS_RULE_FIELDS.map(field => {
          const error = touched[field.key] ? validateField(field, values[field.key] ?? '') : null;
          return (
            <Grid item xs={12} sm={6} key={field.key}>
              <TextField
                label={field.label}
                placeholder={field.placeholder}
                value={values[field.key] ?? ''}
                onChange={e => onChange(field.key, e.target.value)}
                onBlur={() => onTouch(field.key)}
                error={!!error}
                helperText={error ?? field.helperText}
                inputProps={{ maxLength: field.maxLength }}
                required={field.required}
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
          );
        })}
      </Grid>

      <Typography variant="caption" color="#64748B" display="block" mt={2}>
        Essas informações serão injetadas em todos os recursos deste provisionamento.
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
  onViewPayload: (item: CartItem) => void;
}

function ItemCard({ item, index, disabled, onEdit, onRemove, onViewPayload }: ItemCardProps) {
  const provider = getProvider(item.offer.providerId);
  const params = Object.entries(item.parameters);

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
        <Box display="flex" alignItems="center" gap={1.5} mb={params.length > 0 ? 2 : 0}>
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
            startIcon={<PayloadIcon fontSize="small" />}
            disabled={disabled}
            onClick={() => onViewPayload(item)}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary', fontSize: '0.75rem' }}
          >
            Ver payload
          </Button>
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
  const isEditingRef = useRef(false);
  const [payloadItem, setPayloadItem] = useState<CartItem | null>(null);
  const [finalPayloadOpen, setFinalPayloadOpen] = useState(false);
  const [destination, setDestination] = useState<Record<string, string>>(
    () => Object.fromEntries(BUSINESS_RULE_FIELDS.map(f => [f.key, '']))
  );
  const [destinationTouched, setDestinationTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (items.length === 0 && !isEditingRef.current) navigate('/cloud-marketplace');
  }, [items.length, navigate]);

  const byOffer = groupByOffer(items);

  const handleDestinationChange = (key: string, value: string) => {
    setDestination(prev => ({ ...prev, [key]: value }));
  };

  const handleDestinationTouch = (key: string) => {
    setDestinationTouched(prev => ({ ...prev, [key]: true }));
  };

  const handleEdit = (item: CartItem) => {
    isEditingRef.current = true;
    const editValues: Record<string, string> = {};
    for (const [k, v] of Object.entries(item.parameters)) editValues[k] = String(v);
    navigate(`/cloud-marketplace/${item.offer.providerId}/${item.offer.id}/provision`, {
      state: { editValues, editItemId: item.id, returnTo: '/checkout/review' },
    });
  };

  const handleConfirm = () => {
    const allTouched = Object.fromEntries(BUSINESS_RULE_FIELDS.map(f => [f.key, true]));
    setDestinationTouched(allTouched);
    if (!validateAllFields(destination)) return;
    navigate('/provisioning', { state: { items, destination } });
  };

  if (items.length === 0) return null;

  return (
    <>
      <PayloadDialog item={payloadItem} destination={destination} onClose={() => setPayloadItem(null)} />
      <FinalPayloadDialog items={items} destination={destination} open={finalPayloadOpen} onClose={() => setFinalPayloadOpen(false)} />
      <style>{fadeIn}</style>
      <Box sx={{ bgcolor: '#F8FAFC', minHeight: '100%', px: { xs: 2, md: 5 }, py: 4 }}>

        {/* Page header */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(`/cloud-marketplace/${items[0]?.offer.providerId ?? ''}`)}
            sx={{ color: 'text.secondary', mb: 2, pl: 0, '&:hover': { bgcolor: 'transparent', color: 'primary.main' } }}
          >
            Adicionar mais recursos
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
              <DestinationSection values={destination} touched={destinationTouched} onChange={handleDestinationChange} onTouch={handleDestinationTouch} />
              {items.map((item, i) => (
                <ItemCard key={item.id} item={item} index={i} disabled={false} onEdit={handleEdit} onRemove={removeItem} onViewPayload={setPayloadItem} />
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
                  {byOffer.map(({ name, count }) => {
                    return (
                      <Box key={name} display="flex" alignItems="center" justifyContent="space-between" gap={1}>
                        <Box display="flex" alignItems="center" gap={1} minWidth={0}>
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
                  onClick={handleConfirm}
                  startIcon={<CheckCircleIcon />}
                  sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, mb: 1.5 }}
                >
                  Provisionar
                </Button>

                <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mb={1.5}>
                  Os recursos serão criados automaticamente após a confirmação.
                </Typography>

                <Button
                  variant="outlined"
                  fullWidth
                  size="large"
                  onClick={() => navigate(`/cloud-marketplace/${items[0]?.offer.providerId ?? ''}`)}
                  sx={{ borderRadius: 2, fontWeight: 700, py: 1.5, borderColor: '#003087', color: '#003087', mb: 1.5 }}
                >
                  Adicionar mais recursos
                </Button>

                <Divider sx={{ borderColor: '#E2ECF6', mb: 1.5 }} />

                <Button
                  variant="text"
                  fullWidth
                  startIcon={<PayloadIcon sx={{ fontSize: 18 }} />}
                  onClick={() => setFinalPayloadOpen(true)}
                  sx={{ color: 'text.secondary', fontSize: '0.8rem', fontWeight: 600, py: 0.75 }}
                >
                  Ver payload final
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
}
