export const PORTFOLIO_SIGLA: Record<string, string> = {
  Listados: 'lst',
  Balcão: 'blc',
  Tecnologia: 'ti',
};

export function computeRepoName(portfolio: string, productName: string): string {
  const sigla = PORTFOLIO_SIGLA[portfolio] ?? '';
  if (!sigla || !productName) return '';
  return `${sigla}-${productName}-iac`;
}

export interface BusinessRuleField {
  key: string;
  label: string;
  placeholder?: string;
  regex?: RegExp;
  maxLength?: number;
  minLength?: number;
  helperText?: string;
  required?: boolean;
  options?: string[];
}

export const BUSINESS_RULE_FIELDS: BusinessRuleField[] = [
  {
    key: 'product_name',
    label: 'Nome do Produto',
    placeholder: 'ex: sigf',
    minLength: 3,
    maxLength: 11,
    regex: /^[a-z]{3,11}$/,
    helperText: 'Use apenas letras minúsculas (3–11 caracteres)',
    required: true,
  },
  {
    key: 'system',
    label: 'Sistema',
    helperText: 'Informe qual sistema o produto pertence.',
    required: true,
    options: [
      'csd-central-securities-depository',
      'rtc-real-time-clearing',
      'sog-sistema-de-onus-e-gravames',
    ],
  },
  {
    key: 'portfolio',
    label: 'Portfólio',
    helperText: 'Informe qual portfólio o produto pertence.',
    required: true,
    options: ['Listados', 'Balcão', 'Tecnologia'],
  },
  {
    key: 'value_chain',
    label: 'Cadeia de Valor',
    helperText: 'Informe qual cadeia de valor o produto pertence.',
    required: true,
    options: ['emissores', 'dados-corporativos', 'dados-regulatórios'],
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
