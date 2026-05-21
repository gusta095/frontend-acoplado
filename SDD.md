# Cloud Marketplace — Spec Document (SDD)

> **Projeto:** Cloud Marketplace  
> **Versão:** 0.1.0  
> **Status:** Implementado ✅  
> **Autores:** GustaLab  

---

## Índice

1. [Visão Geral e Objetivos](#1-visão-geral-e-objetivos)
2. [User Stories e Fluxo do Usuário](#2-user-stories-e-fluxo-do-usuário)
3. [Arquitetura de Componentes (Frontend)](#3-arquitetura-de-componentes-frontend)
4. [Contratos de Dados — Tipos, Schemas e APIs](#4-contratos-de-dados--tipos-schemas-e-apis)
5. [Critérios de Aceite e Definition of Done](#5-critérios-de-aceite-e-definition-of-done)

---

## 1. Visão Geral e Objetivos

### 1.1 Contexto

O **Cloud Marketplace** é uma aplicação web interna que funciona como uma loja de recursos de cloud. Engenheiros e times de produto podem navegar por ofertas de providers de cloud (Azure, AWS, OCI), explorar os detalhes de cada recurso e solicitar o provisionamento de forma guiada, sem precisar conhecer os detalhes de infraestrutura subjacente.

A metáfora central é a de um **e-commerce**: providers são categorias/lojas, ofertas são produtos, e o provisionamento é o "checkout".

> **Nota de arquitetura:** A v0.1 foi implementada como aplicação React standalone (Vite). A integração como plugin Backstage é planejada para versões futuras, aproveitando os contratos de API e tipos já definidos neste SDD.

### 1.2 Objetivos

| # | Objetivo | Métrica de Sucesso |
|---|----------|--------------------|
| O1 | Permitir descoberta self-service de recursos cloud disponíveis | Usuário consegue encontrar e visualizar uma oferta em menos de 3 cliques |
| O2 | Padronizar e abstrair a experiência de provisionamento entre providers | Fluxo de checkout idêntico independente do provider |
| O3 | Entregar UI funcional como aplicação standalone, preparada para futura integração ao Backstage | App roda sem erros em `npm run dev`; contratos de API compatíveis com Backstage |
| O4 | Dar visibilidade sobre o que está disponível antes de provisionar | Página de detalhe com todas as informações relevantes da oferta |

### 1.3 Fora de Escopo (v0.1)

- Implementação do backend de provisionamento (tratado como stub/mock)
- Autenticação e autorização granular por time/namespace
- Billing e estimativa de custo em tempo real
- Histórico de provisionamentos (catálogo de instâncias)
- Providers além de Azure, AWS e OCI

### 1.4 Premissas Técnicas

- **Stack:** React 18 + TypeScript, Vite 8, Material UI v5, React Router v6
- **Ícones:** `@mui/icons-material` — importados via barrel ESM (`import { X } from '@mui/icons-material'`) para compatibilidade com Vite
- **Tema:** MUI Theme customizado com paleta B3 (`theme.ts`) — override global de cores, tipografia (IBM Plex Sans) e componentes
- **Dados:** Consumidos de `src/mocks/offers.mock.json` via `MockMarketplaceClient` — sem chamadas HTTP reais na v0.1
- **Rota base:** `/cloud-marketplace`
- **Estado do carrinho:** `CartContext` (React Context) em memória — sem persistência na v0.1
- **Estado local:** `useState` / `useReducer` por página — sem Redux

### 1.5 Identidade Visual

- **Paleta de cores:** Inspirada no layout da B3 (Brasil Bolsa Balcão) — fundo branco, azul primário profundo (`#003087`), azul de destaque (`#0050B3`), sem cores fora dessa família exceto os `accentColor` dos providers
- **Tipografia:** IBM Plex Sans (Google Fonts) — 400/500/600/700/800; aplicada via MUI theme override
- **Tom visual:** Clean, institucional, profissional — sem gradientes agressivos ou elementos decorativos excessivos

---

## 2. User Stories e Fluxo do Usuário

### 2.1 Personas

**Engenheiro de Plataforma (Admin)**
> Responsável por cadastrar e manter as ofertas disponíveis por provider. (Fora do escopo da UI v0.1 — gerenciado via JSON/config)

**Engenheiro de Software / Dev (Consumidor)**
> Quer provisionar recursos cloud de forma rápida, sem precisar escrever IaC do zero.

---

### 2.2 User Stories

#### Épico 1 — Navegação e Descoberta

```
US-01
Como engenheiro,
Quero ver os providers disponíveis na página inicial do marketplace,
Para escolher de qual cloud eu quero provisionar um recurso.

Critério: A página exibe cards para Azure, AWS e OCI com seus logos e a quantidade de ofertas disponíveis em cada um.
```

```
US-02
Como engenheiro,
Quero clicar em um provider e ver suas ofertas listadas,
Para entender o que posso provisionar naquele cloud.

Critério: Ao clicar em um provider, exibe uma lista/grid de ofertas com nome, descrição curta, categoria e um badge do provider.
```

```
US-03
Como engenheiro,
Quero filtrar as ofertas por categoria (ex: Compute, Storage, Networking),
Para encontrar mais facilmente o que preciso.

Critério: Filtros por categoria funcionam como chips/tags e refletem instantaneamente na listagem sem reload de página.
```

```
US-04
Como engenheiro,
Quero buscar ofertas pelo nome ou descrição,
Para encontrar um recurso específico rapidamente.

Critério: Campo de busca com debounce de 300ms, filtrando por nome e descrição. Exibe estado vazio se não houver resultados.
```

---

#### Épico 2 — Detalhe da Oferta

```
US-05
Como engenheiro,
Quero clicar em uma oferta e ver sua página de detalhe,
Para entender o que esse recurso faz antes de solicitar.

Critério: Página de detalhe exibe: nome, descrição longa, provider, categoria, lista de parâmetros necessários e botão "Provisionar".
```

```
US-06
Como engenheiro,
Quero ver quais parâmetros são obrigatórios e quais são opcionais,
Para entender o que preciso preencher antes de provisionar.

Critério: Parâmetros obrigatórios marcados com asterisco (*). Tooltip ou texto auxiliar por campo.
```

---

#### Épico 3 — Checkout / Provisionamento

```
US-07
Como engenheiro,
Quero preencher um formulário com os parâmetros da oferta e submeter,
Para solicitar o provisionamento do recurso.

Critério: Formulário com validação em tempo real. Botão "Confirmar" desabilitado até todos os campos obrigatórios estarem preenchidos e válidos.
```

```
US-08
Como engenheiro,
Quero ver uma tela de confirmação antes de provisionar,
Para revisar os dados antes de submeter.

Critério: Tela de review mostra um resumo dos parâmetros preenchidos, nome da oferta, provider e dois botões: "Voltar" e "Confirmar Provisionamento".
```

```
US-09
Como engenheiro,
Quero receber feedback visual após submeter,
Para saber se o provisionamento foi aceito ou falhou.

Critério: Estado de loading durante a chamada. Toast/banner de sucesso com mensagem de confirmação, ou mensagem de erro com causa. Ambos acessíveis via screen reader (aria-live).
```

#### Épico 4 — Carrinho de Pedidos

```
US-10
Como engenheiro,
Quero adicionar uma oferta configurada ao carrinho antes de provisionar,
Para revisar e confirmar múltiplos pedidos de uma só vez.

Critério: Botão "Adicionar ao Carrinho" no final do formulário de parâmetros.
O item entra no carrinho com os parâmetros preenchidos. O ícone do carrinho
no topo atualiza o contador.
```

```
US-11
Como engenheiro,
Quero abrir o carrinho e ver todos os pedidos pendentes,
Para revisar o que estou prestes a provisionar antes de confirmar.

Critério: Painel lateral (drawer) exibe lista de itens com nome da oferta,
provider, parâmetros preenchidos e opção de remover cada item.
Botão "Confirmar todos os pedidos" dispara o provisionamento em sequência.
```

```
US-12
Como engenheiro,
Quero remover um item do carrinho,
Para desistir de um pedido sem perder os outros.

Critério: Botão de remoção por item. Carrinho vazio exibe EmptyState.
```

---

### 2.3 Fluxo Completo (Happy Path)

```
[AppLayout — sempre visível]
 ├── Sidebar esquerda com navegação
 ├── GlobalSearchBar no topo
 └── CartButton com contador no canto superior direito

        │
        ▼
[Home do Marketplace] ← menu "Cloud" na sidebar
        │
        ▼
  Seleciona Provider (ex: AWS)
  — OU usa GlobalSearchBar para busca direta —
        │
        ▼
  [Listagem de Ofertas do Provider]
   └── Filtra por categoria (opcional)
        │
        ▼
  Clica em uma Oferta (ex: S3 Bucket)
        │
        ▼
  [Página de Detalhe da Oferta]
   └── Lê descrição, parâmetros, pré-requisitos
        │
        ▼
  Clica em "Configurar e Adicionar"
        │
        ▼
  [Formulário de Parâmetros]
   └── Preenche campos obrigatórios e opcionais
        │
        ▼
  Clica em "Adicionar ao Carrinho"
        │
        ▼
  [Carrinho atualizado — contador +1]
   └── Usuário pode continuar navegando ou abrir o carrinho
        │
        ▼
  Abre CartDrawer (ícone no topo)
        │
        ▼
  [Carrinho / Revisão de Pedidos]
   ├── Lista todos os itens com parâmetros
   ├── Remove itens (opcional)
   └── "Confirmar todos os pedidos"
        │
        ▼
  [Estado de Loading por item]
        │
   ┌────┴────┐
   ▼         ▼
Sucesso    Erro
 (Toast)  (Banner por item)
```

---

## 3. Arquitetura de Componentes (Frontend)

### 3.1 Estrutura de Diretórios

```
src/
├── App.tsx                        # Raiz: ThemeProvider + CartProvider + BrowserRouter + Routes
├── main.tsx                       # Entry point React 18
├── theme.ts                       # MUI theme customizado (paleta B3, tipografia IBM Plex Sans)
│
├── types/
│   └── index.ts                   # Todos os tipos TypeScript
│
├── api/
│   ├── MarketplaceApi.ts          # Interface da API
│   └── MockMarketplaceClient.ts   # Implementação mock (dados estáticos)
│
├── hooks/
│   ├── useProviders.ts
│   ├── useOffers.ts
│   ├── useOfferDetail.ts
│   └── useProvisioning.ts
│
├── context/
│   └── CartContext.tsx            # CartProvider + useCart hook
│
├── mocks/
│   └── offers.mock.json           # 8 ofertas (Azure ×3, AWS ×3, OCI ×2)
│
├── components/
│   ├── AppLayout/
│   │   ├── AppLayout.tsx             # Layout raiz — sidebar + topbar + área de conteúdo
│   │   ├── Sidebar.tsx               # Menu lateral (logo clicável + nav + user info)
│   │   ├── SidebarItem.tsx           # Item individual do menu com estado ativo
│   │   ├── SidebarUserInfo.tsx       # Bloco inferior: avatar + nome + role
│   │   └── TopBar.tsx                # AppBar fixo com GlobalSearchBar e CartButton
│   │
│   ├── MarketplacePage/
│   │   ├── MarketplacePage.tsx       # Grid de provider cards
│   │   └── ProviderCard.tsx          # Card clicável com cor de destaque do provider
│   │
│   ├── OffersPage/
│   │   ├── OffersPage.tsx            # Feed contínuo com breadcrumb e filtros
│   │   ├── OfferCard.tsx             # Card de oferta com badge, categoria e duração
│   │   └── CategoryFilter.tsx        # Chips de filtro (lógica OR)
│   │
│   ├── OfferDetailPage/
│   │   ├── OfferDetailPage.tsx       # Header, descrição, link de docs e lista de parâmetros
│   │   └── ParameterList.tsx         # Tabela de parâmetros com tipo, obrigatoriedade e tooltip
│   │
│   ├── ProvisioningPage/
│   │   ├── ProvisioningPage.tsx      # Orquestra formulário + validação + addItem no carrinho
│   │   ├── ProvisioningForm.tsx      # Campos dinâmicos: TextField, Select, Checkbox, Number
│   │   └── ProvisioningResult.tsx    # Componente de resultado (sucesso/erro) — usado no CartDrawer
│   │
│   ├── Cart/
│   │   ├── CartButton.tsx            # IconButton com Badge no TopBar; abre CartDrawer
│   │   ├── CartDrawer.tsx            # Drawer direito: lista pedidos, confirma em sequência
│   │   ├── CartItemCard.tsx          # Card de item: parâmetros, provider badge, remoção, resultado
│   │   └── CartEmptyState.tsx        # Estado vazio do carrinho
│   │
│   └── shared/
│       ├── GlobalSearchBar.tsx       # Autocomplete cross-provider, debounce 300ms, navega ao detalhe
│       ├── ProviderBadge.tsx         # Chip colorido por provider (AWS/Azure/OCI)
│       ├── CategoryChip.tsx          # Chip de categoria com estado selecionado
│       └── EmptyState.tsx            # Estado vazio reutilizável
```

---

### 3.2 Árvore de Componentes por Página

#### 3.2.0 Layout Global (`AppLayout`)

Todas as páginas do plugin são envolvidas por `<AppLayout>`, que define a estrutura de três áreas fixas:

```
<AppLayout>
  ├── <Sidebar> (240px, fixo, borda direita)
  │     ├── <ButtonBase> Logo clicável → /cloud-marketplace
  │     │     ├── Ícone Cloud (gradiente azul)
  │     │     └── "Cloud / Marketplace" (texto)
  │     ├── <Divider />
  │     ├── <SidebarItem icon={CloudIcon}    label="Cloud"       />  → /cloud-marketplace ✅
  │     ├── <SidebarItem icon={StorageIcon}  label="On-Premise"  />  tooltip "Em breve"
  │     ├── <SidebarItem icon={HistoryIcon}  label="Auditoria"   />  tooltip "Em breve"
  │     ├── <SidebarItem icon={BarChartIcon} label="Métricas"    />  tooltip "Em breve"
  │     ├── <SidebarItem icon={SettingsIcon} label="Configuração"/>  tooltip "Em breve"
  │     └── <SidebarUserInfo /> → Avatar "GS" + "Gustavo / Admin"
  │
  ├── <TopBar> (AppBar fixo, largura = 100% - 240px)
  │     ├── <GlobalSearchBar />    ← centralizado
  │     └── <CartButton />         ← direita, badge com contador
  │
  └── <main> pt=56px (altura do TopBar)
        └── {children}
```

**Comportamento da Sidebar:**
- Item ativo com fundo azul claro + indicador lateral + texto bold
- Logo e itens "em construção" com hover sutil (`rgba(0,48,135,0.05)`)
- Itens "em construção" exibem tooltip "Em breve" e não disparam navegação

**Comportamento do `CartButton`:**
- Ícone de carrinho/lista com badge numérico
- Ao clicar, abre `<CartDrawer>` como painel overlay à direita
- Badge some quando carrinho está vazio

---

#### 3.2.1 Marketplace Home (`/cloud-marketplace`)

```
<MarketplacePage>
  ├── <Header title="Cloud Marketplace" />      ← Backstage Header
  └── <Grid>
        ├── <ProviderCard provider="aws" />
        ├── <ProviderCard provider="azure" />
        └── <ProviderCard provider="oci" />
```

**Props de `ProviderCard`:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `provider` | `Provider` | Dados do provider (id, nome, logo, cor) |
| `offerCount` | `number` | Quantidade de ofertas disponíveis |
| `onClick` | `() => void` | Navega para a listagem de ofertas |

---

#### 3.2.2 Listagem de Ofertas (`/cloud-marketplace/:providerId`)

```
<OffersPage>
  ├── <Header title="{Provider} Offers" />
  ├── <CategoryFilter categories={[...]} activeCategory={...} />
  └── <Grid>
        └── <OfferCard offer={...} /> × N
```

**Props de `OfferCard`:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `offer` | `Offer` | Dados da oferta |
| `onClick` | `() => void` | Navega para o detalhe |

**Comportamento de `GlobalSearchBar`:**
- Sempre visível no topo via `MarketplaceLayout`
- Debounce de 300ms antes de exibir resultados
- Busca cross-provider em `offer.name` e `offer.shortDescription` de todas as ofertas
- Exibe lista de sugestões (autocomplete) conforme o usuário digita
- Ao clicar num resultado, navega direto para `/:providerId/:offerId` (página de detalhe)
- Exibe `<EmptyState>` se nenhum resultado encontrado

---

#### 3.2.3 Detalhe da Oferta (`/cloud-marketplace/:providerId/:offerId`)

```
<OfferDetailPage>
  ├── <Header title="{Offer Name}" />
  ├── <ProviderBadge provider={...} />
  ├── <CategoryChip category={...} />
  ├── <Typography> descrição longa </Typography>
  ├── <ParameterList parameters={offer.parameters} />
  └── <Button onClick={goToProvisioning}> Provisionar </Button>
```

**Props de `ParameterList`:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `parameters` | `OfferParameter[]` | Lista de parâmetros |

---

#### 3.2.4 Provisionamento (`/cloud-marketplace/:providerId/:offerId/provision`)

`<ProvisioningPage>` renderiza o formulário e chama `addItem()` do `CartContext` ao submeter:

```
<ProvisioningPage>
  └── <ProvisioningForm />   ← campos dinâmicos + validação em tempo real
        ├── TextField         (type: string)
        ├── TextField type=number (type: number)
        ├── Select            (type: select)
        └── Checkbox          (type: boolean)
```

Ao clicar em "Adicionar ao Carrinho":
1. Valida todos os campos (pattern, min/maxLength, obrigatoriedade)
2. Chama `addItem(offer, parameters)` no `CartContext`
3. Exibe toast de confirmação
4. Navega de volta para `/:providerId/:offerId`

**Props de `ProvisioningForm`:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `parameters` | `OfferParameter[]` | Schema dos campos |
| `values` | `Record<string, string>` | Estado atual dos campos |
| `errors` | `Record<string, string>` | Erros de validação por campo |
| `onChange` | `(key: string, value: string) => void` | Handler de mudança |

---

#### 3.2.5 Carrinho de Pedidos (`CartDrawer`)

```
<CartDrawer open={boolean} onClose={fn}>
  ├── [items.length === 0] → <CartEmptyState />
  └── [items.length > 0]
        ├── <CartItem /> × N
        │     ├── Nome da oferta + badge do provider
        │     ├── Parâmetros preenchidos (resumo)
        │     └── Botão remover item
        └── <Button onClick={confirmAll}> Confirmar todos os pedidos </Button>
```

**Estado do `CartDrawer` após confirmar:**

```
type CartConfirmStep = 'idle' | 'loading' | 'done';
```

- `loading`: exibe `<Progress>` enquanto provisiona cada item em sequência
- `done`: exibe resultado por item (sucesso ou erro com motivo)

---

### 3.3 Gerenciamento de Estado

- **Estado local por página** via `useState` e `useReducer` — sem Redux na v0.1
- **Dados remotos** via hooks customizados com `useAsync` do `@backstage/core-plugin-api`
- **Estado do formulário de provisionamento** gerenciado em `ProvisioningPage` e passado como props
- **Estado do carrinho** via React Context (`CartContext`) — único estado global do plugin, compartilhado entre `CartButton` (contador), `CartDrawer` (lista) e `ProvisioningPage` (adicionar item)

---

### 3.4 Roteamento

```tsx
// App.tsx — React Router v6
<Routes>
  <Route path="/"                                               element={<Navigate to="/cloud-marketplace" replace />} />
  <Route path="/cloud-marketplace"                             element={<MarketplacePage />} />
  <Route path="/cloud-marketplace/:providerId"                 element={<OffersPage />} />
  <Route path="/cloud-marketplace/:providerId/:offerId"        element={<OfferDetailPage />} />
  <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={<ProvisioningPage />} />
</Routes>
```

---

## 4. Contratos de Dados — Tipos, Schemas e APIs

### 4.1 Tipos TypeScript

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
  longDescription: string;        // Markdown — usado na página de detalhe
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

### 4.2 API Interface

```typescript
// api/MarketplaceApi.ts

export interface MarketplaceApi {
  /**
   * Retorna todos os providers disponíveis.
   */
  getProviders(): Promise<Provider[]>;

  /**
   * Retorna todas as ofertas de um provider.
   * @param providerId - ID do provider
   * @param filters - Filtros opcionais de categoria e busca
   */
  getOffers(
    providerId: ProviderId,
    filters?: { category?: OfferCategory; search?: string }
  ): Promise<Offer[]>;

  /**
   * Retorna o detalhe de uma oferta específica.
   * @param offerId - Slug da oferta
   */
  getOfferById(offerId: string): Promise<Offer>;

  /**
   * Submete uma requisição de provisionamento.
   * @param request - Parâmetros do provisionamento
   */
  provision(request: ProvisioningRequest): Promise<ProvisioningResponse>;
}
```

---

### 4.3 Mock Data — Exemplo de Payload

```json
// __mocks__/offers.mock.json (estrutura esperada)

{
  "providers": [
    {
      "id": "aws",
      "name": "Amazon Web Services",
      "shortName": "AWS",
      "logoUrl": "/marketplace/logos/aws.svg",
      "accentColor": "#FF9900",
      "description": "Compute, storage, databases e mais na AWS."
    },
    {
      "id": "azure",
      "name": "Microsoft Azure",
      "shortName": "Azure",
      "logoUrl": "/marketplace/logos/azure.svg",
      "accentColor": "#0078D4",
      "description": "Serviços cloud da Microsoft."
    },
    {
      "id": "oci",
      "name": "Oracle Cloud Infrastructure",
      "shortName": "OCI",
      "logoUrl": "/marketplace/logos/oci.svg",
      "accentColor": "#C74634",
      "description": "Infraestrutura de alto desempenho da Oracle."
    }
  ],
  "offers": [
    {
      "id": "azure-resource-group",
      "providerId": "azure",
      "name": "Resource Group",
      "shortDescription": "Crie um Resource Group no Azure para agrupar recursos relacionados.",
      "longDescription": "## Resource Group\n\nUm **Resource Group** é um contêiner lógico no Azure que agrupa recursos com o mesmo ciclo de vida...",
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

### 4.4 Endpoints REST (contrato esperado do backend)

> Na v0.1, esses endpoints são mockados pelo `MockMarketplaceClient`. Quando o backend for implementado, deverá respeitar estes contratos.

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

---

## 5. Critérios de Aceite e Definition of Done

### 5.1 Critérios de Aceite por User Story

| US | Critério | Testável via |
|----|----------|--------------|
| US-01 | Página `/cloud-marketplace` exibe 3 provider cards com logo, nome e contagem de ofertas | Teste de renderização (RTL) |
| US-01 | Cards exibem `offerCount` corretamente a partir dos dados do mock | Teste unitário |
| US-02 | Clicar num provider navega para `/cloud-marketplace/:providerId` | Teste de rota / E2E |
| US-02 | Grid de ofertas renderiza todos os itens do mock para o provider selecionado | Teste de renderização |
| US-03 | Selecionar categoria filtra a lista sem reload de página | Teste de interação (RTL) |
| US-03 | Múltiplos filtros de categoria são combinados com OR (oferta aparece se pertence a qualquer categoria selecionada) | Teste unitário de lógica de filtro |
| US-04 | Busca com debounce de 300ms filtra por nome e shortDescription | Teste de interação com fake timers |
| US-04 | Busca sem resultado exibe `<EmptyState>` | Teste de renderização |
| US-05 | Clicar num offer card navega para `/cloud-marketplace/:providerId/:offerId` | Teste de rota |
| US-05 | Página de detalhe exibe todos os campos do objeto `Offer` | Teste de renderização |
| US-06 | Parâmetros obrigatórios exibem asterisco (*) | Teste de snapshot / RTL |
| US-07 | Botão "Confirmar" permanece desabilitado até campos obrigatórios preenchidos | Teste de interação |
| US-07 | Validação de `pattern` e `minLength/maxLength` exibe mensagem de erro inline | Teste de interação |
| US-08 | Tela de review lista todos os parâmetros preenchidos e o nome da oferta | Teste de renderização |
| US-08 | Botão "Voltar" retorna ao formulário mantendo os valores preenchidos | Teste de interação |
| US-09 | Estado de loading exibe `<Progress>` durante a chamada ao `provision()` | Teste com mock de API + fake timer |
| US-09 | Resposta de sucesso exibe banner com `requestId` | Teste de integração |
| US-09 | Resposta de erro exibe mensagem com motivo | Teste de integração |

---

### 5.2 Definition of Done (DoD)

Um item de trabalho é considerado **Done** quando:

#### Código
- [ ] Código implementado em TypeScript sem erros de compilação (`tsc --noEmit`)
- [ ] Sem uso de `any` explícito sem justificativa documentada
- [ ] Componentes com tipagem completa de props via `interface`
- [ ] Sem `console.log` de debug remanescente

#### Testes
- [ ] Cobertura de testes unitários ≥ 80% por componente
- [ ] Todos os critérios de aceite da US cobertos por pelo menos 1 teste
- [ ] `yarn test` passa sem falhas

#### UI/UX
- [ ] Todos os estados de UI implementados: loading, empty, error, success
- [ ] Componentes seguem o design system do Backstage (`@backstage/core-components`)
- [ ] Responsividade validada em viewport ≥ 1024px
- [ ] Navegação por teclado funcional nos elementos interativos principais
- [ ] Atributos `aria-label` nos botões e elementos sem texto visível

#### Integração com Backstage
- [ ] Plugin registrado e montado corretamente via `createPlugin` e `createRoutableExtension`
- [ ] Rota `/cloud-marketplace` acessível na sidebar do Backstage
- [ ] Plugin funciona com `MockMarketplaceClient` habilitado por padrão
- [ ] Nenhum erro de console ao montar o plugin em Backstage `dev` mode

#### Documentação
- [ ] `README.md` do plugin com instrução de instalação e configuração
- [ ] Interface `MarketplaceApi` documentada com JSDoc
- [ ] Tipos exportados públicos documentados

---

### 5.3 Checklist de Revisão de Spec (antes de iniciar implementação)

- [ ] Todos os tipos em `types/index.ts` revisados e aprovados
- [ ] Mock JSON validado contra os tipos TypeScript
- [ ] Fluxo completo (seção 2.3) walkthrough feito com pelo menos 1 stakeholder
- [ ] Estrutura de diretórios aprovada
- [ ] Contratos de API REST revisados (mesmo que mockados)
- [ ] DoD alinhado com o time

---

## Apêndice A — Decisões em Aberto

| # | Decisão | Opções | Status |
|---|---------|--------|--------|
| D1 | Filtragem por categoria: AND ou OR entre múltiplas categorias selecionadas? | OR | ✅ Definido |
| D2 | Como identificar o usuário que solicitou o provisionamento? | Omitir — o Backstage já autentica o usuário via sessão, o backend extrai a identidade pelo token HTTP | ✅ Definido |
| D3 | O campo de busca deve funcionar cross-provider ou apenas dentro de um provider? | Cross-provider — barra global sempre visível no topo, busca em todas as ofertas de todos os providers, ao clicar no resultado navega direto para o detalhe da oferta | ✅ Definido |
| D4 | Paginação na listagem de ofertas (quando houver muitos itens)? | Feed contínuo — todas as ofertas exibidas em grid/lista sem paginação, como um feed de loja | ✅ Definido |

---

*Documento gerado como parte do processo SDD — GustaLab Cloud Marketplace Plugin v0.1*