import type {
  ConditionalGroup,
  FieldGroup,
  Offer,
  OfferCategory,
  OfferParameter,
  OfferStep,
  ParameterType,
  ParameterWidget,
  ProviderId,
} from '../types';

type PropDef = {
  type?: string;
  title?: string;
  description?: string;
  default?: unknown;
  enum?: string[];
  enumNames?: string[];
  items?: { type?: string; enum?: string[]; enumNames?: string[] };
  pattern?: string;
  patternMessage?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  const?: string | number | boolean;
  'ui:widget'?: string;
};

type BranchDef = {
  properties: Record<string, PropDef>;
  required?: string[];
  dependencies?: Record<string, { oneOf: BranchDef[] }>;
};

type SchemaDef = {
  required?: string[];
  properties: Record<string, PropDef>;
  dependencies?: Record<string, { oneOf: BranchDef[] }>;
  groups?: Array<{ title: string; description?: string; fields: string[] }>;
};

export interface TemplateYaml {
  name: string;
  title: string;
  description: string;
  provider: string;
  category?: OfferCategory;
  tags?: string[];
  schema?: SchemaDef;
  steps?: Array<{
    title: string;
    description?: string;
    schema: SchemaDef;
  }>;
}

function mapSingleParameter(key: string, prop: PropDef, requiredSet: Set<string>): OfferParameter {
  // type: array + items.enum → multiselect
  const isArray = prop.type === 'array';
  const enumValues = isArray ? prop.items?.enum : prop.enum;
  const enumNames  = isArray ? prop.items?.enumNames : prop.enumNames;

  let type: ParameterType;
  if (isArray && enumValues?.length) type = 'multiselect';
  else if (enumValues?.length) type = 'select';
  else if (prop.type === 'integer' || prop.type === 'number') type = 'number';
  else if (prop.type === 'boolean') type = 'boolean';
  else type = 'string';

  const param: OfferParameter = {
    key,
    label: prop.title ?? key,
    type,
    required: requiredSet.has(key),
    description: prop.description,
    defaultValue: prop.default !== undefined ? String(prop.default) : undefined,
    options: enumValues,
  };

  if (enumValues && enumNames?.length) {
    param.optionLabels = Object.fromEntries(
      enumValues.map((val, i) => [val, enumNames![i] ?? val])
    );
  }

  const widget = prop['ui:widget'];
  if (widget) param.widget = widget as ParameterWidget;

  if (
    prop.pattern ||
    prop.patternMessage ||
    prop.minLength !== undefined ||
    prop.maxLength !== undefined ||
    prop.minimum !== undefined ||
    prop.maximum !== undefined
  ) {
    param.validation = {
      pattern: prop.pattern,
      patternMessage: prop.patternMessage,
      minLength: prop.minLength,
      maxLength: prop.maxLength,
      min: prop.minimum,
      max: prop.maximum,
    };
  }

  return param;
}

function parseDependencies(
  dependencies: Record<string, { oneOf: BranchDef[] }>,
): ConditionalGroup[] {
  const groups: ConditionalGroup[] = [];

  for (const [triggerField, dep] of Object.entries(dependencies)) {
    if (!dep.oneOf) continue;

    for (const branch of dep.oneOf) {
      const triggerProp = branch.properties[triggerField];
      if (triggerProp?.const === undefined) continue;

      const triggerValue = String(triggerProp.const);
      const branchRequired = new Set(branch.required ?? []);
      const branchParams = Object.entries(branch.properties)
        .filter(([key]) => key !== triggerField)
        .map(([key, prop]) => mapSingleParameter(key, prop, branchRequired));

      const nestedConditionals = branch.dependencies
        ? parseDependencies(branch.dependencies)
        : [];

      if (branchParams.length > 0 || nestedConditionals.length > 0) {
        groups.push({ triggerField, triggerValue, parameters: branchParams, conditionals: nestedConditionals });
      }
    }
  }

  return groups;
}

function parseSchema(schema: SchemaDef): { parameters: OfferParameter[]; conditionals: ConditionalGroup[]; groups?: FieldGroup[] } {
  const required = new Set(schema.required ?? []);
  const parameters = Object.entries(schema.properties).map(([key, prop]) =>
    mapSingleParameter(key, prop, required)
  );
  const conditionals = schema.dependencies ? parseDependencies(schema.dependencies) : [];
  const groups = schema.groups?.map(g => ({ title: g.title, description: g.description, fields: g.fields }));
  return { parameters, conditionals, groups };
}

export function templateToOffer(tpl: TemplateYaml): Offer {
  let parameters: OfferParameter[] = [];
  let steps: OfferStep[] | undefined;

  if (tpl.steps?.length) {
    steps = tpl.steps.map(step => {
      const { parameters: stepParams, conditionals, groups } = parseSchema(step.schema);
      return { title: step.title, description: step.description, parameters: stepParams, conditionals, groups };
    });
    parameters = steps.flatMap(s => s.parameters);
  } else if (tpl.schema) {
    const { parameters: p, conditionals, groups } = parseSchema(tpl.schema);
    parameters = p;
    if (conditionals.length > 0 || groups?.length) {
      steps = [{ title: '', description: undefined, parameters: p, conditionals, groups }];
    }
  }

  return {
    id: tpl.name,
    providerId: tpl.provider as ProviderId,
    name: tpl.title,
    shortDescription: tpl.description,
    longDescription: tpl.description,
    category: tpl.category ?? 'other',
    tags: tpl.tags,
    parameters,
    steps,
  };
}
