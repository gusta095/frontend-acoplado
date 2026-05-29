import { Box, Breadcrumbs, Button, CircularProgress, Divider, Link, Paper, Snackbar, Alert, Typography } from '@mui/material';
import { AddShoppingCart as AddShoppingCartIcon } from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useCart } from '../../../../context/CartContext';
import { useOfferDetail } from '../../../../hooks/useOfferDetail';
import { PROVIDER_NAMES } from '../../../../constants/providers';
import { ProvisioningForm } from './ProvisioningForm';

function validate(
  parameters: { key: string; required: boolean; type: string; validation?: { pattern?: string; minLength?: number; maxLength?: number; min?: number; max?: number } }[],
  values: Record<string, string>
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const param of parameters) {
    const val = values[param.key] ?? '';
    if (param.required && !val.trim()) {
      errors[param.key] = 'Campo obrigatório.';
      continue;
    }
    if (!val) continue;
    const v = param.validation;
    if (v?.pattern && !new RegExp(v.pattern).test(val)) {
      errors[param.key] = `Formato inválido. Padrão esperado: ${v.pattern}`;
    }
    if (v?.minLength && val.length < v.minLength) {
      errors[param.key] = `Mínimo ${v.minLength} caracteres.`;
    }
    if (v?.maxLength && val.length > v.maxLength) {
      errors[param.key] = `Máximo ${v.maxLength} caracteres.`;
    }
    if (param.type === 'number') {
      const num = Number(val);
      if (v?.min !== undefined && num < v.min) errors[param.key] = `Valor mínimo: ${v.min}.`;
      if (v?.max !== undefined && num > v.max) errors[param.key] = `Valor máximo: ${v.max}.`;
    }
  }
  return errors;
}

export function ProvisioningPage() {
  const { providerId, offerId } = useParams<{ providerId: string; offerId: string }>();
  const navigate = useNavigate();
  const { state } = useLocation() as { state: { editValues?: Record<string, string> } | null };
  const { addItem } = useCart();
  const { offer, loading } = useOfferDetail(offerId ?? '');
  const [values, setValues] = useState<Record<string, string>>(state?.editValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress sx={{ color: '#003087' }} />
      </Box>
    );
  }
  if (!offer) return null;

  // Pre-fill defaults
  const getEffectiveValues = () => {
    const result: Record<string, string> = {};
    for (const param of offer.parameters) {
      result[param.key] = values[param.key] ?? param.defaultValue ?? '';
    }
    return result;
  };

  const handleChange = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) {
      const effective = { ...next };
      for (const param of offer.parameters) {
        effective[param.key] = effective[param.key] ?? param.defaultValue ?? '';
      }
      const errs = validate(offer.parameters, effective);
      setErrors(prev => {
        const updated = { ...prev };
        if (errs[key]) updated[key] = errs[key];
        else delete updated[key];
        return updated;
      });
    }
  };

  const handleBlur = (key: string) => {
    setTouched(prev => ({ ...prev, [key]: true }));
    const effective = getEffectiveValues();
    const errs = validate(offer.parameters, effective);
    setErrors(prev => {
      const updated = { ...prev };
      if (errs[key]) updated[key] = errs[key];
      else delete updated[key];
      return updated;
    });
  };

  const isValid = () => {
    const effective = getEffectiveValues();
    const errs = validate(offer.parameters, effective);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    const effective = getEffectiveValues();
    const errs = validate(offer.parameters, effective);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const params: Record<string, string | number | boolean> = {};
    for (const param of offer.parameters) {
      const val = effective[param.key];
      if (param.type === 'number') params[param.key] = Number(val);
      else if (param.type === 'boolean') params[param.key] = val === 'true';
      else params[param.key] = val;
    }
    addItem(offer, params);
    setValues({});
    setTouched({});
    setErrors({});
    setToast(true);
  };

  return (
    <Box p={4} maxWidth={680}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate('/cloud-marketplace')}>
          Cloud Marketplace
        </Link>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(`/cloud-marketplace/${providerId}`)}>
          {PROVIDER_NAMES[providerId ?? ''] ?? providerId}
        </Link>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(`/cloud-marketplace/${providerId}/${offerId}`)}>
          {offer.name}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={600}>Configurar</Typography>
      </Breadcrumbs>

      <Box mb={3}>
        <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
          Configurar: {offer.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preencha os parâmetros abaixo. Campos com <Typography component="span" color="error.main" variant="body2">*</Typography> são obrigatórios.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <ProvisioningForm
          parameters={offer.parameters}
          values={getEffectiveValues()}
          errors={errors}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Box display="flex" gap={2}>
        <Button variant="outlined" onClick={() => navigate(-1)} sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}>
          Voltar
        </Button>
        <Button
          variant="contained"
          startIcon={<AddShoppingCartIcon />}
          onClick={handleSubmit}
          disabled={!isValid()}
        >
          Adicionar ao Carrinho
        </Button>
      </Box>

      <Snackbar open={toast} autoHideDuration={2000} onClose={() => setToast(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity="success" variant="filled" sx={{ backgroundColor: '#003087' }}>
          "{offer.name}" adicionado ao carrinho!
        </Alert>
      </Snackbar>
    </Box>
  );
}
