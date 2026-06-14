export interface BusinessRuleField {
  key: string;
  label: string;
  placeholder?: string;
  regex?: RegExp;
  maxLength?: number;
  helperText?: string;
  required?: boolean;
}

export const BUSINESS_RULE_FIELDS: BusinessRuleField[] = [
  {
    key: 'sistema',
    label: 'Sistema',
    placeholder: 'ex: SIGF',
    maxLength: 20,
    regex: /^[A-Za-z0-9\-_]+$/,
    helperText: 'Letras, números, hífens e underscores',
    required: true,
  },
  {
    key: 'grupo_trabalho',
    label: 'Grupo de Trabalho',
    placeholder: 'ex: SRE',
    maxLength: 30,
    regex: /^[A-Za-zÀ-ÿ0-9\s\-]+$/,
    helperText: 'Letras, números e hífens',
    required: true,
  },
];

export function validateField(field: BusinessRuleField, value: string): string | null {
  if (field.required && !value.trim()) return 'Campo obrigatório';
  if (value && field.regex && !field.regex.test(value)) return field.helperText ?? 'Formato inválido';
  return null;
}

export function validateAllFields(values: Record<string, string>): boolean {
  return BUSINESS_RULE_FIELDS.every(f => validateField(f, values[f.key] ?? '') === null);
}
