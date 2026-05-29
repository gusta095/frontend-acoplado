# Arquitetura de Componentes (Frontend)

---

## Estrutura de Diretórios

```
src/
├── App.tsx                        # Raiz: ThemeProvider + CartProvider + DeploymentHistoryProvider + BrowserRouter + Routes
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
├── constants/
│   └── providers.ts               # PROVIDER_NAMES — mapa de ProviderId para nome completo
│
├── context/
│   ├── CartContext.tsx            # CartProvider + useCart hook
│   └── DeploymentHistoryContext.tsx  # DeploymentHistoryProvider + useDeploymentHistory hook; persiste em localStorage
│
├── mocks/
│   └── offers.mock.json           # 8 ofertas (Azure ×3, AWS ×3, OCI ×2)
│
└── components/
    ├── AppLayout/                 # Layout global — compartilhado entre todas as seções
    │   ├── AppLayout.tsx          # Sidebar + TopBar + área de conteúdo
    │   ├── Sidebar.tsx            # Menu lateral com grupos colapsáveis
    │   ├── SidebarItem.tsx        # Item individual com estado ativo
    │   ├── SidebarUserInfo.tsx    # Bloco inferior: avatar + nome + role
    │   └── TopBar.tsx             # AppBar fixo com GlobalSearchBar e CartButton
    │
    ├── HomePage/
    │   └── HomePage.tsx           # Página inicial: hero, cards de módulos e tiles de stats
    │
    ├── observability/
    │   └── deployments/
    │       ├── DeploymentsListPage.tsx  # Histórico de todos os lotes (/deployments)
    │       └── DeploymentPage.tsx       # Detalhe de um lote (/deployments/:batchId)
    │
    └── infrastructure/
        ├── shared/                # Motor genérico — reutilizado por cloud e on-premise
        │   ├── Cart/
        │   │   ├── CartButton.tsx        # IconButton com Badge no TopBar; abre CartDrawer
        │   │   ├── CartDrawer.tsx        # Drawer: lista pedidos, confirma em sequência, salva lote e navega para /deployments/:batchId
        │   │   ├── CartItemCard.tsx      # Card de item com parâmetros, badge e resultado
        │   │   └── CartEmptyState.tsx    # Estado vazio do carrinho
        │   │
        │   ├── OffersPage/
        │   │   ├── OffersPage.tsx        # Feed contínuo com breadcrumb e filtros
        │   │   ├── OfferCard.tsx         # Card de oferta com badge, categoria e duração
        │   │   └── CategoryFilter.tsx    # Chips de filtro (lógica OR)
        │   │
        │   ├── OfferDetailPage/
        │   │   ├── OfferDetailPage.tsx   # Header, descrição, docs e lista de parâmetros
        │   │   └── ParameterList.tsx     # Tabela de parâmetros com tipo e obrigatoriedade
        │   │
        │   ├── ProvisioningPage/
        │   │   ├── ProvisioningPage.tsx  # Orquestra formulário + validação + addItem no carrinho
        │   │   └── ProvisioningForm.tsx  # Campos dinâmicos: TextField, Select, Checkbox, Number
        │   │
        │   ├── ProviderBadge.tsx         # Chip de provider — genérico (cloud e on-premise)
        │   ├── CategoryChip.tsx          # Chip de categoria com estado selecionado
        │   └── EmptyState.tsx            # Estado vazio reutilizável
        │
        ├── cloud/                 # Time Cloud — apenas o que é cloud-específico
        │   ├── MarketplacePage/
        │   │   ├── MarketplacePage.tsx   # Grid de provider cards cloud
        │   │   └── ProviderCard.tsx      # Card com cor de destaque do provider
        │   └── shared/
        │       └── GlobalSearchBar.tsx   # Busca cross-provider cloud, debounce 300ms
        │
        └── onpremise/             # Time On-Premise — estrutura pronta para crescer
            └── README.md          # Guia de implementação: o que criar, o que reutilizar e passo a passo
```

---

## Layout Global (`AppLayout`)

Todas as páginas são envolvidas por `<AppLayout>`, que define três áreas fixas:

```
<AppLayout>
  ├── <Sidebar> (240px, fixo, borda direita, scroll vertical)
  │     ├── <ButtonBase> Logo clicável → /
  │     │
  │     ├── <SidebarGroup icon={LayersIcon}     label="Infraestrutura"> ← aberto por padrão
  │     │     ├── <SidebarItem label="Cloud"       />  → /cloud-marketplace ✅
  │     │     └── <SidebarItem label="On-Premise"  />  tooltip "Em breve"
  │     │
  │     ├── <SidebarGroup icon={VisibilityIcon} label="Observabilidade"> ← fechado por padrão
  │     │     ├── <SidebarItem label="Implantações" />  → /deployments ✅
  │     │     ├── <SidebarItem label="Dashboards"   />  tooltip "Em breve"
  │     │     ├── <SidebarItem label="Métricas"     />  tooltip "Em breve"
  │     │     └── <SidebarItem label="Logs"         />  tooltip "Em breve"
  │     │
  │     ├── <SidebarGroup icon={SettingsIcon}   label="Configurações">  ← fechado por padrão
  │     │     ├── <SidebarItem label="Cadastros"   />  tooltip "Em breve"
  │     │     ├── <SidebarItem label="Integrações" />  tooltip "Em breve"
  │     │     └── <SidebarItem label="Permissões"  />  tooltip "Em breve"
  │     │
  │     └── <SidebarUserInfo /> → Avatar "GS" + "Gustavo / Admin"
  │
  ├── <TopBar> (AppBar fixo, largura = 100% - 240px)
  │     ├── <GlobalSearchBar />    ← centralizado
  │     └── <CartButton />         ← direita, badge com contador
  │
  └── <main> pt=56px (altura do TopBar)
        └── {children}
```

**Comportamentos:**
- `SidebarGroup` é colapsável — clique no header faz toggle com animação de 180ms
- Header do grupo tem estilo de botão: fundo `rgba(0,48,135,0.07)`, ícone + texto em `#003087`, bordas arredondadas — mesmo visual do item ativo
- "Infraestrutura" abre por padrão; demais grupos iniciam fechados
- `SidebarItem` ativo tem fundo azul claro + indicador lateral + texto bold
- Itens desabilitados exibem tooltip "Em breve" e não disparam navegação
- `CartButton` abre `<CartDrawer>` como painel overlay à direita; badge some quando carrinho está vazio

---

## Roteamento

```tsx
// App.tsx — React Router v6
<Routes>
  <Route path="/"                                               element={<HomePage />} />
  <Route path="/cloud-marketplace"                             element={<MarketplacePage />} />
  <Route path="/cloud-marketplace/:providerId"                 element={<OffersPage />} />
  <Route path="/cloud-marketplace/:providerId/:offerId"        element={<OfferDetailPage />} />
  <Route path="/cloud-marketplace/:providerId/:offerId/provision" element={<ProvisioningPage />} />
  <Route path="/deployments"                                   element={<DeploymentsListPage />} />
  <Route path="/deployments/:batchId"                          element={<DeploymentPage />} />
</Routes>
```

---

## Árvore de Componentes por Página

### Home (`/`)

```
<HomePage>
  ├── Hero (gradiente azul B3 com saudação personalizada)
  ├── <Grid> Módulos
  │     ├── Card "Cloud Marketplace" → /cloud-marketplace (ativo)
  │     ├── Card "Implantações"      → /deployments (ativo)
  │     └── Card "Configurações"     → (em breve, desabilitado)
  └── <Grid> Acesso rápido (tiles de stats)
        ├── Providers disponíveis (3)
        ├── Ofertas no catálogo (8)
        ├── Pedidos no carrinho (dinâmico — via useCart)
        └── Provisionamentos realizados (estático "0" na v0.1)
```

---

### Marketplace Home (`/cloud-marketplace`)

```
<MarketplacePage>
  └── <Grid>
        ├── <ProviderCard provider="aws" />
        ├── <ProviderCard provider="azure" />
        └── <ProviderCard provider="oci" />
```

---

### Listagem de Ofertas (`/cloud-marketplace/:providerId`)

```
<OffersPage>
  ├── <CategoryFilter categories={[...]} activeCategory={...} />
  └── <Grid>
        └── <OfferCard offer={...} /> × N
```

**Comportamento de `GlobalSearchBar`:**
- Debounce de 300ms antes de exibir resultados
- Busca cross-provider em `offer.name` e `offer.shortDescription`
- Ao clicar num resultado, navega direto para `/:providerId/:offerId`

---

### Detalhe da Oferta (`/cloud-marketplace/:providerId/:offerId`)

```
<OfferDetailPage>
  ├── <ProviderBadge provider={...} />
  ├── <CategoryChip category={...} />
  ├── <Typography> descrição longa </Typography>
  ├── <ParameterList parameters={offer.parameters} />
  └── <Button onClick={goToProvisioning}> Provisionar </Button>
```

---

### Provisionamento (`/cloud-marketplace/:providerId/:offerId/provision`)

`<ProvisioningPage>` renderiza o formulário e chama `addItem()` do `CartContext` ao submeter — **não provisiona diretamente**.

```
<ProvisioningPage>
  └── <ProvisioningForm />
        ├── TextField         (type: string)
        ├── TextField number  (type: number)
        ├── Select            (type: select)
        └── Checkbox          (type: boolean)
        ⚠️  multiselect — tipo existe em ParameterType mas não implementado no formulário
```

Ao clicar em "Adicionar ao Carrinho":
1. Valida todos os campos (pattern, min/maxLength, obrigatoriedade)
2. Chama `addItem(offer, parameters)` no `CartContext`
3. Exibe toast de confirmação
4. Navega de volta para `/:providerId/:offerId`

---

### Carrinho de Pedidos (`CartDrawer`)

```
<CartDrawer open={boolean} onClose={fn}>
  ├── [items.length === 0] → <CartEmptyState />
  └── [items.length > 0]
        ├── <CartItemCard /> × N
        │     ├── Nome da oferta + badge do provider
        │     ├── Parâmetros preenchidos (resumo)
        │     └── Botão remover item
        └── <Button onClick={confirmAll}> Confirmar todos os pedidos </Button>
```

Estados após confirmar (`CartConfirmStep`): `idle` → `loading` → `done`

As chamadas reais de provisionamento acontecem aqui via `provisionAll` do `useProvisioning`.

---

### Histórico de Implantações (`/deployments`)

```
<DeploymentsListPage>
  ├── [batches.length === 0] → EmptyState com botão "Ir para o Marketplace"
  └── [batches.length > 0]
        └── <Paper clickável /> × N
              ├── Ícone de status (sucesso/falha)
              ├── "Lote #N" + Chip de status + data/hora + contagem
              └── Chips das ofertas do lote
```

---

### Detalhe de Implantação (`/deployments/:batchId`)

```
<DeploymentPage>
  ├── Botão "← Histórico de implantações"
  ├── Título "Lote #N" + Chip de resumo (X de Y confirmados)
  ├── <Paper> Metadados: ID do lote, data/hora, total de pedidos
  ├── <Paper colorido /> × N  (verde = accepted, vermelho = failed)
  │     ├── Nome da oferta + <ProviderBadge /> + Chip status
  │     ├── Chips de parâmetros (label: valor)
  │     └── Request ID, mensagem e timestamp da resposta
  └── Botões: "Novo provisionamento" (→ /cloud-marketplace) e "Ver histórico" (→ /deployments)
```

---

## Gerenciamento de Estado

- **Estado global:** `CartContext` (carrinho) e `DeploymentHistoryContext` (histórico de lotes)
  - `CartContext` — compartilhado entre `CartButton` (contador), `CartDrawer` (lista) e `ProvisioningPage` (adicionar item)
  - `DeploymentHistoryContext` — persistido em `localStorage` (`cloud-marketplace:deployment-history`); expõe `batches`, `addBatch` e `getBatch`; consumido por `CartDrawer` (escrita), `DeploymentsListPage` e `DeploymentPage` (leitura)
- **Estado local por página:** `useState` e `useReducer` — sem Redux
- **Estado do formulário:** gerenciado em `ProvisioningPage` e passado como props para `ProvisioningForm`
- **Dados remotos:** hooks customizados (`useProviders`, `useOffers`, `useOfferDetail`, `useProvisioning`), cada um com sua própria instância de `MockMarketplaceClient`

## Limitações conhecidas da v0.1

- **`CartDrawer` limpa o carrinho apenas no sucesso total:** ao fechar o drawer após provisionamento, `clearCart()` só é chamado se **todos** os itens retornaram `status: 'accepted'`. Itens com falha permanecem no carrinho para nova tentativa.
- **"Provisionamentos realizados" na HomePage é estático:** exibe sempre "0" — não lê `DeploymentHistoryContext`. Para ser dinâmico, basta contar `batches.flatMap(b => b.results).filter(r => r.response.status === 'accepted').length`.
