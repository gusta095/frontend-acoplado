export type ProviderId = 'aws' | 'azure' | 'oci' | 'vmware' | 'proxmox' | 'baremetal';

export interface Provider {
  id: ProviderId;
  name: string;
  shortName: string;
  logoUrl: string;
  accentColor: string;
  description: string;
}

export type OfferCategory = string;

export type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect';

export type ParameterWidget = 'radio' | 'textarea';

export interface OfferParameter {
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  optionLabels?: Record<string, string>;
  widget?: ParameterWidget;
  validation?: {
    pattern?: string;
    patternMessage?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

export interface ConditionalGroup {
  triggerField: string;
  triggerValue: string;
  parameters: OfferParameter[];
  conditionals: ConditionalGroup[];
}

export interface FieldGroup {
  title: string;
  description?: string;
  fields: string[];
}

export interface OfferStep {
  title: string;
  description?: string;
  parameters: OfferParameter[];
  conditionals: ConditionalGroup[];
  groups?: FieldGroup[];
}

export interface Offer {
  id: string;
  providerId: ProviderId;
  name: string;
  shortDescription: string;
  longDescription: string;
  category: OfferCategory;
  tags?: string[];
  iconUrl?: string;
  parameters: OfferParameter[];
  steps?: OfferStep[];
  estimatedDuration?: string;
  documentationUrl?: string;
}

export type ParameterValue = string | number | boolean | string[];

export interface CartItem {
  id: string;
  offer: Offer;
  parameters: Record<string, ParameterValue>;
  addedAt: string;
}

export interface ProvisioningRequest {
  offerId: string;
  providerId: ProviderId;
  parameters: Record<string, ParameterValue>;
}

export interface ProvisioningResponse {
  requestId: string;
  status: 'accepted' | 'failed';
  message: string;
  timestamp: string;
}
