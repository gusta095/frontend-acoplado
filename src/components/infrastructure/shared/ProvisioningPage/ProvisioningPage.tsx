import {
  Box, Breadcrumbs, Button, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, Divider, Link, Paper, Step, StepLabel, Stepper, Typography,
} from '@mui/material';
import { AddShoppingCart as AddShoppingCartIcon, Warning as WarningIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useActiveCart } from '../../../../hooks/useActiveCart';
import { useMarketplaceClient } from '../../../../context/MarketplaceClientContext';
import { useOfferDetail } from '../../../../hooks/useOfferDetail';
import { PROVIDER_NAMES } from '../../../../constants/providers';
import { ProvisioningForm } from './ProvisioningForm';
import type { ConditionalGroup, OfferParameter } from '../../../../types';

function getVisibleParams(
  parameters: OfferParameter[],
  conditionals: ConditionalGroup[],
  values: Record<string, string>,
): OfferParameter[] {
  const visible: OfferParameter[] = [];
  const triggerFields = new Set(conditionals.map(c => c.triggerField));
  for (const param of parameters) {
    visible.push(param);
    if (!triggerFields.has(param.key)) continue;
    const currentVal = values[param.key] ?? '';
    for (const group of conditionals) {
      if (group.triggerField === param.key && group.triggerValue === currentVal) {
        visible.push(...getVisibleParams(group.parameters, group.conditionals, values));
      }
    }
  }
  return visible;
}

function parseMultiValue(raw: string): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return raw.split(',').filter(Boolean); }
}

function validate(
  parameters: OfferParameter[],
  values: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const param of parameters) {
    const val = values[param.key] ?? '';

    if (param.type === 'multiselect') {
      if (param.required && parseMultiValue(val).length === 0) {
        errors[param.key] = 'Selecione ao menos uma opção.';
      }
      continue;
    }

    if (param.required && !val.trim()) {
      errors[param.key] = 'Campo obrigatório.';
      continue;
    }
    if (!val) continue;
    const v = param.validation;
    if (v?.pattern && !new RegExp(v.pattern).test(val)) {
      errors[param.key] = v.patternMessage ?? `Formato inválido. Padrão esperado: ${v.pattern}`;
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
  const location = useLocation();
  const { state } = location as { state: { editValues?: Record<string, string>; returnTo?: string } | null };
  const { addItem, activeProvider, clearCart, items } = useActiveCart();
  const { basePath, marketplaceName } = useMarketplaceClient();
  const { offer, loading } = useOfferDetail(offerId ?? '');

  const [values, setValues] = useState<Record<string, string>>(state?.editValues ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);

  useEffect(() => {
    if (state?.editValues) {
      setValues(state.editValues);
      setTouched({});
      setErrors({});
      setCurrentStep(0);
    }
  }, [location.key]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress sx={{ color: '#003087' }} />
      </Box>
    );
  }
  if (!offer) return null;

  const steps = offer.steps ?? [];
  const isWizard = steps.length > 1;
  const activeStepDef = steps[currentStep];

  const getEffectiveValues = (params?: OfferParameter[]) => {
    const all = params ?? (activeStepDef ? activeStepDef.parameters : offer.parameters);
    const result: Record<string, string> = {};
    for (const param of all) {
      result[param.key] = values[param.key] ?? param.defaultValue ?? '';
    }
    return result;
  };

  const getVisibleForCurrentStep = () => {
    if (!activeStepDef) return offer.parameters;
    return getVisibleParams(activeStepDef.parameters, activeStepDef.conditionals, values);
  };

  const handleChange = (key: string, value: string) => {
    const next = { ...values, [key]: value };
    setValues(next);
    if (touched[key]) {
      const visibleParams = getVisibleParams(
        activeStepDef?.parameters ?? offer.parameters,
        activeStepDef?.conditionals ?? [],
        next,
      );
      const errs = validate(visibleParams, next);
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
    const visibleParams = getVisibleForCurrentStep();
    const effective: Record<string, string> = {};
    for (const p of visibleParams) effective[p.key] = values[p.key] ?? p.defaultValue ?? '';
    const errs = validate(visibleParams, effective);
    setErrors(prev => {
      const updated = { ...prev };
      if (errs[key]) updated[key] = errs[key];
      else delete updated[key];
      return updated;
    });
  };

  const validateCurrentStep = () => {
    const visibleParams = getVisibleForCurrentStep();
    const effective: Record<string, string> = {};
    for (const p of visibleParams) effective[p.key] = values[p.key] ?? p.defaultValue ?? '';
    return validate(visibleParams, effective);
  };

  const isCurrentStepValid = () => Object.keys(validateCurrentStep()).length === 0;

  const handleNext = () => {
    const errs = validateCurrentStep();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setCurrentStep(s => s + 1);
    setErrors({});
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate(-1);
    } else {
      setCurrentStep(s => s - 1);
      setErrors({});
    }
  };

  const buildPayload = () => {
    const params: Record<string, string | number | boolean | string[]> = {};
    for (const step of steps.length > 0 ? steps : [{ parameters: offer.parameters, conditionals: [] }]) {
      const visible = getVisibleParams(step.parameters, step.conditionals ?? [], values);
      for (const param of visible) {
        const val = values[param.key] ?? param.defaultValue ?? '';
        if (param.type === 'multiselect') params[param.key] = parseMultiValue(val);
        else if (param.type === 'number') params[param.key] = Number(val);
        else if (param.type === 'boolean') params[param.key] = val === 'true';
        else params[param.key] = val;
      }
    }
    return params;
  };

  const commitAdd = (params: Record<string, string | number | boolean | string[]>) => {
    addItem(offer, params);
    navigate(state?.returnTo ?? `${basePath}/${providerId}`);
  };

  const handleSubmit = () => {
    const errs = validateCurrentStep();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const payload = buildPayload();
    if (activeProvider && activeProvider !== offer.providerId) {
      setConflictDialogOpen(true);
      return;
    }
    commitAdd(payload);
  };

  const handleConflictConfirm = () => {
    clearCart();
    setConflictDialogOpen(false);
    commitAdd(buildPayload());
  };

  const isLastStep = !isWizard || currentStep === steps.length - 1;

  return (
    <Box p={4} maxWidth={680}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(basePath)}>
          {marketplaceName}
        </Link>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(`${basePath}/${providerId}`)}>
          {PROVIDER_NAMES[providerId ?? ''] ?? providerId}
        </Link>
        <Link underline="hover" color="text.secondary" sx={{ cursor: 'pointer', fontSize: '0.875rem' }}
          onClick={() => navigate(`${basePath}/${providerId}/${offerId}`)}>
          {offer.name}
        </Link>
        <Typography variant="body2" color="text.primary" fontWeight={600}>Configurar</Typography>
      </Breadcrumbs>

      <Box mb={3}>
        <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
          Configurar: {offer.name}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preencha os parâmetros abaixo. Campos com{' '}
          <Typography component="span" color="error.main" variant="body2">*</Typography> são obrigatórios.
        </Typography>
      </Box>

      {isWizard && (
        <Box mb={3}>
          <Stepper activeStep={currentStep} alternativeLabel>
            {steps.map((step, index) => (
              <Step key={index}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: '#003087' },
                      '&.Mui-completed': { color: '#003087' },
                    },
                  }}
                >
                  <Typography variant="caption">{step.title}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
      )}

      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        {isWizard && activeStepDef?.description && (
          <Typography variant="body2" color="text.secondary" mb={2}>
            {activeStepDef.description}
          </Typography>
        )}
        <ProvisioningForm
          parameters={activeStepDef?.parameters ?? offer.parameters}
          conditionals={activeStepDef?.conditionals}
          groups={activeStepDef?.groups}
          values={{ ...getEffectiveValues(), ...values }}
          errors={errors}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Paper>

      <Divider sx={{ mb: 3 }} />

      <Box display="flex" gap={2}>
        <Button
          variant="outlined"
          onClick={handleBack}
          sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}
        >
          Voltar
        </Button>

        {!isLastStep && (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!isCurrentStepValid()}
            sx={{ bgcolor: '#003087', '&:hover': { bgcolor: '#0050B3' } }}
          >
            Próximo
          </Button>
        )}

        {isLastStep && (
          <Button
            variant="contained"
            startIcon={<AddShoppingCartIcon />}
            onClick={handleSubmit}
            disabled={!isCurrentStepValid()}
          >
            Adicionar ao Carrinho
          </Button>
        )}
      </Box>

      <Dialog open={conflictDialogOpen} onClose={() => setConflictDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon sx={{ color: '#D97706' }} />
          Provedor diferente no carrinho
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Seu carrinho já contém {items.length} {items.length === 1 ? 'item' : 'itens'} do provedor{' '}
            <Typography component="span" fontWeight={700} color="text.primary">
              {PROVIDER_NAMES[activeProvider ?? ''] ?? activeProvider}
            </Typography>
            . Não é permitido misturar provedores em um mesmo pedido.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1.5}>
            Deseja limpar o carrinho para continuar com{' '}
            <Typography component="span" fontWeight={700} color="text.primary">
              {PROVIDER_NAMES[offer.providerId] ?? offer.providerId}
            </Typography>
            ?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setConflictDialogOpen(false)}
            sx={{ borderColor: '#E2E8F0', color: 'text.secondary' }}>
            Cancelar
          </Button>
          <Button variant="contained" color="warning" onClick={handleConflictConfirm}>
            Limpar carrinho
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
