import {
  Autocomplete, Box, Checkbox, Chip, FormControl, FormControlLabel, FormHelperText,
  InputLabel, MenuItem, OutlinedInput, Radio, RadioGroup, Select, TextField, Typography
} from '@mui/material';
import type { ConditionalGroup, OfferParameter } from '../../../../types';

interface FormCallbacks {
  onChange: (key: string, value: string) => void;
  onBlur?: (key: string) => void;
}

interface Props extends FormCallbacks {
  parameters: OfferParameter[];
  conditionals?: ConditionalGroup[];
  values: Record<string, string>;
  errors: Record<string, string>;
}

function parseMultiValue(raw: string): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return raw.split(',').filter(Boolean); }
}

function ParameterField({
  param,
  value,
  error,
  onChange,
  onBlur,
}: {
  param: OfferParameter;
  value: string;
  error?: string;
} & FormCallbacks) {
  if (param.type === 'boolean') {
    return (
      <FormControl error={!!error}>
        <FormControlLabel
          control={
            <Checkbox
              checked={value === 'true'}
              onChange={e => onChange(param.key, String(e.target.checked))}
              onBlur={() => onBlur?.(param.key)}
              sx={{ color: '#003087', '&.Mui-checked': { color: '#003087' } }}
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={500}>
                {param.label}
                {param.required && <Typography component="span" color="error.main" ml={0.25}>*</Typography>}
              </Typography>
              {param.description && (
                <Typography variant="caption" color="text.secondary">{param.description}</Typography>
              )}
            </Box>
          }
        />
        {error && <FormHelperText>{error}</FormHelperText>}
      </FormControl>
    );
  }

  if (param.type === 'multiselect' && param.options) {
    const selected = parseMultiValue(value);
    return (
      <Autocomplete
        multiple
        options={param.options}
        value={selected}
        onChange={(_, newValue) => onChange(param.key, JSON.stringify(newValue))}
        onBlur={() => onBlur?.(param.key)}
        getOptionLabel={opt => param.optionLabels?.[opt] ?? opt}
        renderTags={(tagValues, getTagProps) =>
          tagValues.map((opt, index) => (
            <Chip
              {...getTagProps({ index })}
              label={param.optionLabels?.[opt] ?? opt}
              size="small"
              sx={{ bgcolor: '#E8EEF7', color: '#003087' }}
            />
          ))
        }
        renderInput={inputParams => (
          <TextField
            {...inputParams}
            label={
              <span>
                {param.label}{param.required && <span style={{ color: '#E53E3E' }}> *</span>}
              </span>
            }
            helperText={error || param.description}
            error={!!error}
            size="small"
          />
        )}
      />
    );
  }

  if (param.type === 'select') {
    if (param.widget === 'radio' && param.options) {
      return (
        <FormControl error={!!error}>
          <Typography variant="body2" fontWeight={500} mb={0.5}>
            {param.label}
            {param.required && <Typography component="span" color="error.main" ml={0.25}>*</Typography>}
          </Typography>
          <RadioGroup
            value={value}
            onChange={e => onChange(param.key, e.target.value)}
            row
          >
            {param.options.map(opt => (
              <FormControlLabel
                key={opt}
                value={opt}
                control={
                  <Radio
                    onBlur={() => onBlur?.(param.key)}
                    sx={{ color: '#003087', '&.Mui-checked': { color: '#003087' } }}
                  />
                }
                label={param.optionLabels?.[opt] ?? opt}
              />
            ))}
          </RadioGroup>
          {param.description && !error && <FormHelperText>{param.description}</FormHelperText>}
          {error && <FormHelperText error>{error}</FormHelperText>}
        </FormControl>
      );
    }

    return (
      <FormControl fullWidth error={!!error} size="small">
        <InputLabel>{param.label}{param.required && ' *'}</InputLabel>
        <Select
          value={value}
          onChange={e => onChange(param.key, e.target.value as string)}
          onBlur={() => onBlur?.(param.key)}
          input={<OutlinedInput label={`${param.label}${param.required ? ' *' : ''}`} />}
        >
          {param.options?.map(opt => (
            <MenuItem key={opt} value={opt}>
              {param.optionLabels?.[opt] ?? opt}
            </MenuItem>
          ))}
        </Select>
        {param.description && !error && <FormHelperText>{param.description}</FormHelperText>}
        {error && <FormHelperText error>{error}</FormHelperText>}
      </FormControl>
    );
  }

  if (param.widget === 'textarea') {
    return (
      <TextField
        label={
          <span>
            {param.label}{param.required && <span style={{ color: '#E53E3E' }}> *</span>}
          </span>
        }
        value={value}
        onChange={e => onChange(param.key, e.target.value)}
        onBlur={() => onBlur?.(param.key)}
        placeholder={param.placeholder}
        helperText={error || param.description}
        error={!!error}
        size="small"
        fullWidth
        multiline
        minRows={3}
        maxRows={8}
      />
    );
  }

  return (
    <TextField
      label={
        <span>
          {param.label}{param.required && <span style={{ color: '#E53E3E' }}> *</span>}
        </span>
      }
      type={param.type === 'number' ? 'number' : 'text'}
      value={value}
      onChange={e => onChange(param.key, e.target.value)}
      onBlur={() => onBlur?.(param.key)}
      placeholder={param.placeholder}
      helperText={error || param.description}
      error={!!error}
      size="small"
      fullWidth
      inputProps={{ min: param.validation?.min, max: param.validation?.max }}
    />
  );
}

function renderParams(
  parameters: OfferParameter[],
  conditionals: ConditionalGroup[],
  values: Record<string, string>,
  errors: Record<string, string>,
  callbacks: FormCallbacks,
): React.ReactNode[] {
  const triggerFields = new Set(conditionals.map(c => c.triggerField));

  return parameters.map(param => {
    const value = values[param.key] ?? param.defaultValue ?? '';
    const matchingGroups = triggerFields.has(param.key)
      ? conditionals.filter(c => c.triggerField === param.key && c.triggerValue === value)
      : [];

    return (
      <Box key={param.key} display="flex" flexDirection="column" gap={2.5}>
        <ParameterField
          param={param}
          value={value}
          error={errors[param.key]}
          onChange={callbacks.onChange}
          onBlur={callbacks.onBlur}
        />
        {matchingGroups.flatMap(group =>
          renderParams(group.parameters, group.conditionals, values, errors, callbacks)
        )}
      </Box>
    );
  });
}

export function ProvisioningForm({ parameters, conditionals = [], values, errors, onChange, onBlur }: Props) {
  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      {renderParams(parameters, conditionals, values, errors, { onChange, onBlur })}
    </Box>
  );
}
