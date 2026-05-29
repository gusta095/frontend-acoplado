# Contratos de Dados — Tipos, Schemas e APIs

---

## Tipos TypeScript

```typescript
// types/index.ts

// ─── Providers ────────────────────────────────────────────────────────────────

export type ProviderId = 'aws' | 'azure' | 'oci';

export interface Provider {
  id: ProviderId;
  name: string;             // "Amazon Web Services"
  shortName: string;        // "AWS"
  logoUrl: string;          // URL do logo SVG/PNG
  accentColor: string;      // Cor HEX para badge e destaques visuais
  description: string;
}

// ─── Ofertas ──────────────────────────────────────────────────────────────────

export type OfferCategory =
  | 'compute'
  | 'storage'
  | 'networking'
  | 'database'
  | 'security'
  | 'monitoring'
  | 'identity'
  | 'other';

export type ParameterType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect';

export interface OfferParameter {
  key: string;                    // Identificador único do campo. Ex: "resource_group_name"
  label: string;                  // Label exibida ao usuário. Ex: "Nome do Resource Group"
  type: ParameterType;
  required: boolean;
  description?: string;           // Texto auxiliar / tooltip
  placeholder?: string;
  defaultValue?: string;
  options?: string[];             // Apenas para type === 'select' | 'multiselect'
  validation?: {
    pattern?: string;             // Regex de validação
    minLength?: number;
    maxLength?: number;
    min?: number;                 // Para type === 'number'
    max?: number;
  };
}

export interface Offer {
  id: string;                     // Slug único. Ex: "azure-resource-group"
  providerId: ProviderId;
  name: string;                   // "Resource Group"
  shortDescription: string;       // Máx. 120 chars — usado nos cards
  longDescription: string;        // Intenção: Markdown. Na v0.1 é renderizado como texto simples (pre-line) — sem parser de Markdown instalado
  category: OfferCategory;
  tags?: string[];
  iconUrl?: string;               // Ícone específico da oferta
  parameters: OfferParameter[];
  estimatedDuration?: string;     // Ex: "~2 minutos" — informativo
  documentationUrl?: string;
}

// ─── Carrinho ─────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;                    // UUID gerado no frontend (crypto.randomUUID)
  offer: Offer;
  parameters: Record<string, string | number | boolean>;
  addedAt: string;               // ISO 8601
}

// ─── Histórico de Implantações ────────────────────────────────────────────────
// Definido em context/DeploymentHistoryContext.tsx (não em types/index.ts)

export interface DeploymentResult {
  itemId: string;                 // Corresponde a CartItem.id
  response: ProvisioningResponse;
}

export interface DeploymentBatch {
  batchId: string;                // UUID gerado no frontend (crypto.randomUUID)
  timestamp: string;              // ISO 8601 — momento do confirm no CartDrawer
  snapshot: CartItem[];           // Cópia dos itens no momento do confirm
  results: DeploymentResult[];    // Resultado de cada item no lote
}

// ─── Provisionamento ──────────────────────────────────────────────────────────

export interface ProvisioningRequest {
  offerId: string;
  providerId: ProviderId;
  parameters: Record<string, string | number | boolean>;
  requestedBy?: string;           // Identificador do usuário (opcional na v0.1)
}

export interface ProvisioningResponse {
  requestId: string;              // ID da requisição de provisionamento
  status: 'accepted' | 'failed';
  message: string;
  timestamp: string;              // ISO 8601
}
```

---

## Interface da API

```typescript
// api/MarketplaceApi.ts

export interface MarketplaceApi {
  getProviders(): Promise<Provider[]>;
  getOffers(
    providerId: ProviderId,
    filters?: { category?: OfferCategory; search?: string }
  ): Promise<Offer[]>;
  getAllOffers(filters?: { search?: string }): Promise<Offer[]>;
  getOfferById(offerId: string): Promise<Offer>;
  provision(request: ProvisioningRequest): Promise<ProvisioningResponse>;
}
```

Na v0.1, a implementação é `MockMarketplaceClient` — lê de `src/mocks/offers.mock.json` com delays simulados. Quando o backend real for implementado, deve ser um substituto direto sem alterações na interface.

---

## Exemplo de Payload Mock

```json
{
  "providers": [
    {
      "id": "aws",
      "name": "Amazon Web Services",
      "shortName": "AWS",
      "logoUrl": "/marketplace/logos/aws.svg",
      "accentColor": "#FF9900",
      "description": "Compute, storage, databases e mais na AWS."
    }
  ],
  "offers": [
    {
      "id": "azure-resource-group",
      "providerId": "azure",
      "name": "Resource Group",
      "shortDescription": "Crie um Resource Group no Azure para agrupar recursos relacionados.",
      "longDescription": "## Resource Group\n\nUm **Resource Group** é um contêiner lógico no Azure...",
      "category": "other",
      "tags": ["azure", "organizacao", "iac"],
      "parameters": [
        {
          "key": "name",
          "label": "Nome do Resource Group",
          "type": "string",
          "required": true,
          "placeholder": "rg-meu-projeto-prod",
          "description": "Deve seguir o padrão: rg-{projeto}-{ambiente}",
          "validation": {
            "pattern": "^rg-[a-z0-9-]+$",
            "minLength": 5,
            "maxLength": 64
          }
        },
        {
          "key": "location",
          "label": "Região",
          "type": "select",
          "required": true,
          "options": ["brazilsouth", "eastus", "westeurope"],
          "defaultValue": "brazilsouth"
        },
        {
          "key": "environment",
          "label": "Ambiente",
          "type": "select",
          "required": true,
          "options": ["dev", "staging", "prod"]
        }
      ],
      "estimatedDuration": "~30 segundos",
      "documentationUrl": "https://learn.microsoft.com/azure/azure-resource-manager/management/manage-resource-groups-portal"
    }
  ]
}
```

---

## Endpoints REST (contrato esperado do backend)

> Na v0.1, esses endpoints são mockados pelo `MockMarketplaceClient`.

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/api/cloud-marketplace/providers` | Lista todos os providers |
| `GET` | `/api/cloud-marketplace/offers?providerId={id}` | Lista ofertas de um provider |
| `GET` | `/api/cloud-marketplace/offers/{offerId}` | Detalhe de uma oferta |
| `POST` | `/api/cloud-marketplace/provision` | Submete provisionamento |

**Request body `POST /provision`:**
```json
{
  "offerId": "azure-resource-group",
  "providerId": "azure",
  "parameters": {
    "name": "rg-minha-app-prod",
    "location": "brazilsouth",
    "environment": "prod"
  }
}
```

**Response `POST /provision` (sucesso):**
```json
{
  "requestId": "prov-20240315-abc123",
  "status": "accepted",
  "message": "Provisionamento iniciado com sucesso.",
  "timestamp": "2024-03-15T10:32:00Z"
}
```
