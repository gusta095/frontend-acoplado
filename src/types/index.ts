export type ProviderId = 'aws' | 'azure' | 'oci' | 'vmware';

export interface Provider {
  id: ProviderId;
  name: string;
  shortName: string;
  logoUrl: string;
  accentColor: string;
  description: string;
}

export type OfferCategory =
  | 'compute'
  | 'storage'
  | 'networking'
  | 'database'
  | 'security'
  | 'monitoring'
  | 'identity'
  | 'other';

export type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'multiselect';

export interface OfferParameter {
  key: string;
  label: string;
  type: ParameterType;
  required: boolean;
  description?: string;
  placeholder?: string;
  defaultValue?: string;
  options?: string[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
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
  estimatedDuration?: string;
  documentationUrl?: string;
}

export interface CartItem {
  id: string;
  offer: Offer;
  parameters: Record<string, string | number | boolean>;
  addedAt: string;
}

export interface ProvisioningRequest {
  offerId: string;
  providerId: ProviderId;
  parameters: Record<string, string | number | boolean>;
}

export interface ProvisioningResponse {
  requestId: string;
  status: 'accepted' | 'failed';
  message: string;
  timestamp: string;
}
