# Cloud Marketplace

Aplicação web interna para descoberta e provisionamento self-service de recursos cloud (AWS, Azure, OCI). Funciona como uma loja: o engenheiro navega pelas ofertas, configura parâmetros, adiciona ao carrinho e confirma o provisionamento.

> Desenvolvido em React 18 + TypeScript + Vite + MUI v5. Pode rodar standalone ou ser integrado ao Backstage como plugin de frontend.

---

## Rodando standalone (desenvolvimento)

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`. Os dados são servidos pelo mock em `src/mocks/offers.mock.json`.

```bash
npm run build   # build de produção
npm run preview # preview do build
```

---

## Integrando ao Backstage

A integração transforma o app em um plugin Backstage nativo. Os contratos de API (`MarketplaceApi`) e todos os tipos TypeScript já estão preparados para isso.

### Pré-requisitos

- Backstage >= 1.20
- Node 18+
- Monorepo Backstage criado com `npx @backstage/create-app`

---

### Passo 1 — Criar o plugin no monorepo

Dentro do monorepo Backstage, gere a estrutura do plugin:

```bash
yarn backstage-cli new --select plugin
# Nome: cloud-marketplace
```

Isso cria `plugins/cloud-marketplace/` com a estrutura padrão.

---

### Passo 2 — Copiar os arquivos do frontend

Copie as pastas do app standalone para dentro de `plugins/cloud-marketplace/src/`:

```
src/
├── types/
├── api/
├── hooks/
├── context/
├── mocks/
├── components/
└── theme.ts
```

---

### Passo 3 — Substituir as dependências de roteamento

O Backstage usa seu próprio sistema de rotas. Substitua o React Router pelo sistema nativo.

**3.1 — Definir as rotas em `src/routes.ts`:**

```typescript
import { createRouteRef, createSubRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({ id: 'cloud-marketplace' });

export const providerRouteRef = createSubRouteRef({
  id: 'cloud-marketplace:provider',
  parent: rootRouteRef,
  path: '/:providerId',
});

export const offerDetailRouteRef = createSubRouteRef({
  id: 'cloud-marketplace:offer-detail',
  parent: rootRouteRef,
  path: '/:providerId/:offerId',
});

export const provisionRouteRef = createSubRouteRef({
  id: 'cloud-marketplace:provision',
  parent: rootRouteRef,
  path: '/:providerId/:offerId/provision',
});
```

**3.2 — Registrar o plugin em `src/plugin.ts`:**

```typescript
import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef, providerRouteRef, offerDetailRouteRef, provisionRouteRef } from './routes';

export const cloudMarketplacePlugin = createPlugin({
  id: 'cloud-marketplace',
  routes: { root: rootRouteRef },
});

export const CloudMarketplacePage = cloudMarketplacePlugin.provide(
  createRoutableExtension({
    name: 'CloudMarketplacePage',
    component: () => import('./components/AppLayout/AppLayout').then(m => m.AppLayout),
    mountPoint: rootRouteRef,
  }),
);
```

**3.3 — Substituir `useNavigate` e `useParams`:**

Nos componentes que usam React Router, troque pelas APIs do Backstage:

```typescript
// Antes (React Router)
import { useNavigate, useParams } from 'react-router-dom';

// Depois (Backstage)
import { useRouteRef } from '@backstage/core-plugin-api';
import { providerRouteRef, offerDetailRouteRef } from '../../routes';

const toProvider = useRouteRef(providerRouteRef);
// Navegar: navigate(toProvider({ providerId: 'aws' }))
```

---

### Passo 4 — Adaptar o ThemeProvider

O Backstage já fornece um ThemeProvider global. Remova o `<ThemeProvider>` do `App.tsx` e aplique as customizações de cor via `createUnifiedTheme` do Backstage:

```typescript
// packages/app/src/theme.ts
import { createUnifiedTheme } from '@backstage/theme';

export const marketplaceTheme = createUnifiedTheme({
  palette: {
    primary: { main: '#003087' },
    secondary: { main: '#0050B3' },
  },
});
```

---

### Passo 5 — Registrar no app Backstage

**`packages/app/src/App.tsx`:**

```tsx
import { CloudMarketplacePage } from '@internal/plugin-cloud-marketplace';

// Dentro de <FlatRoutes>:
<Route path="/cloud-marketplace" element={<CloudMarketplacePage />} />
```

**`packages/app/src/components/Root/Root.tsx`** (sidebar do Backstage):

```tsx
import CloudIcon from '@mui/icons-material/Cloud';
import { SidebarItem } from '@backstage/core-components';

<SidebarItem icon={CloudIcon} to="cloud-marketplace" text="Cloud Marketplace" />
```

---

### Passo 6 — Conectar ao backend real

Quando o backend de provisionamento estiver disponível, substitua o `MockMarketplaceClient` pela implementação HTTP:

```typescript
// src/api/MarketplaceClient.ts
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import type { MarketplaceApi } from './MarketplaceApi';

export class MarketplaceClient implements MarketplaceApi {
  constructor(private readonly discoveryApi: DiscoveryApi, private readonly fetchApi: FetchApi) {}

  private async getBaseUrl() {
    return this.discoveryApi.getBaseUrl('cloud-marketplace');
  }

  async getProviders() {
    const base = await this.getBaseUrl();
    const res = await this.fetchApi.fetch(`${base}/providers`);
    return res.json();
  }

  async getOffers(providerId, filters) {
    const base = await this.getBaseUrl();
    const params = new URLSearchParams({ providerId, ...filters });
    const res = await this.fetchApi.fetch(`${base}/offers?${params}`);
    return res.json();
  }

  async getOfferById(offerId) {
    const base = await this.getBaseUrl();
    const res = await this.fetchApi.fetch(`${base}/offers/${offerId}`);
    return res.json();
  }

  async provision(request) {
    const base = await this.getBaseUrl();
    const res = await this.fetchApi.fetch(`${base}/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    return res.json();
  }
}
```

Registre o cliente via `createApiFactory` no `plugin.ts`:

```typescript
import { createApiFactory, discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { marketplaceApiRef } from './api/MarketplaceApi';
import { MarketplaceClient } from './api/MarketplaceClient';

export const cloudMarketplacePlugin = createPlugin({
  id: 'cloud-marketplace',
  apis: [
    createApiFactory({
      api: marketplaceApiRef,
      deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
      factory: ({ discoveryApi, fetchApi }) => new MarketplaceClient(discoveryApi, fetchApi),
    }),
  ],
  routes: { root: rootRouteRef },
});
```

---

## Contratos de API REST esperados pelo backend

| Método | Path | Descrição |
|--------|------|-----------|
| `GET` | `/api/cloud-marketplace/providers` | Lista todos os providers |
| `GET` | `/api/cloud-marketplace/offers?providerId={id}` | Lista ofertas de um provider |
| `GET` | `/api/cloud-marketplace/offers/{offerId}` | Detalhe de uma oferta |
| `POST` | `/api/cloud-marketplace/provision` | Submete provisionamento |

Consulte o `SDD.md` para os schemas completos de request/response.

---

## Stack

| Tecnologia | Versão | Uso |
|-----------|--------|-----|
| React | 18 | UI |
| TypeScript | 5 | Tipagem |
| Vite | 8 | Build/dev server |
| Material UI | 5 | Componentes e tema |
| React Router | 6 | Roteamento (standalone) |
| IBM Plex Sans | — | Tipografia |
