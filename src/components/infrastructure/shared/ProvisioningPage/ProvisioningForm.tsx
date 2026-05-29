import {
  Box, Checkbox, FormControl, FormControlLabel, FormHelperText,
  InputLabel, MenuItem, OutlinedInput, Select, TextField, Typography
} from '@mui/material';
import type { OfferParameter } from '../../../../types';

interface Props {
  parameters: OfferParameter[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onBlur?: (key: string) => void;
}

export function ProvisioningForm({ parameters, values, errors, onChange, onBlur }: Props) {
  return (
    <Box display="flex" flexDirection="column" gap={2.5}>
      {parameters.map(param => {
        const value = values[param.key] ?? param.defaultValue ?? '';
        const error = errors[param.key];

        if (param.type === 'boolean') {
          return (
            <FormControl key={param.key} error={!!error}>
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

        if (param.type === 'select') {
          return (
            <FormControl key={param.key} fullWidth error={!!error} size="small">
              <InputLabel>
                {param.label}{param.required && ' *'}
              </InputLabel>
              <Select
                value={value}
                onChange={e => onChange(param.key, e.target.value as string)}
                onBlur={() => onBlur?.(param.key)}
                input={<OutlinedInput label={`${param.label}${param.required ? ' *' : ''}`} />}
              >
                {param.options?.map(opt => (
                  <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                ))}
              </Select>
              {param.description && !error && <FormHelperText>{param.description}</FormHelperText>}
              {error && <FormHelperText error>{error}</FormHelperText>}
            </FormControl>
          );
        }

        return (
          <TextField
            key={param.key}
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
            inputProps={{
              min: param.validation?.min,
              max: param.validation?.max,
            }}
          />
        );
      })}
    </Box>
  );
}
