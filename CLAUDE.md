# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Visão Geral do Projeto

**Cloud Marketplace** é uma SPA React standalone (Vite 8) que funciona como um IDP (Internal Developer Portal) self-service para provisionamento de recursos cloud. Engenheiros navegam por ofertas de providers (AWS, Azure, OCI), configuram parâmetros, submetem pedidos de provisionamento usando a metáfora de carrinho/checkout, e acompanham o histórico de implantações. O app roda standalone em `:5173` e é embutido no Backstage via `<iframe>` — **não é um plugin nativo Backstage**. Não habilite code splitting (Rolldown) sem validar compatibilidade com MUI/Emotion.

## Comandos

```bash
npm run dev       # Inicia o servidor de desenvolvimento (localhost:5173)
npm run build     # Verificação TypeScript + build de produção Vite
npm run lint      # ESLint
npm run preview   # Preview do build de produção
```

Não há testes configurados ainda.

## Arquitetura

### Padrão de acesso a dados

Todo acesso a dados passa pela interface `MarketplaceApi` (`src/api/MarketplaceApi.ts`). A única implementação atual é `MockMarketplaceClient` (`src/api/MockMarketplaceClient.ts`), que lê de `src/mocks/offers.mock.json` com delays assíncronos simulados. Cada hook instancia `MockMarketplaceClient` diretamente — não há injeção de dependência ou contexto para o cliente ainda.

### Estado global

Dois contextos globais:

- `CartContext` (`src/context/CartContext.tsx`) — itens do carrinho, apenas em memória (sem persistência).
- `DeploymentHistoryContext` (`src/context/DeploymentHistoryContext.tsx`) — histórico de lotes de provisionamento, **persistido em `localStorage`** com a chave `cloud-marketplace:deployment-history`. Expõe `batches`, `addBatch` e `getBatch`. O `CartDrawer` chama `addBatch` ao concluir um provisionamento.

Todo o resto é `useState`/`useReducer` local por página.

### Hooks

Cada hook (`useProviders`, `useOffers`, `useOfferDetail`, `useProvisioning`) tem sua própria instância de `MockMarketplaceClient`. `useProvisioning` expõe tanto `provision` (individual) quanto `provisionAll` (lote sequencial, usado pelo `CartDrawer`).

### Roteamento

```
/                                                 → HomePage
/cloud-marketplace                                → MarketplacePage (grid de providers)
/cloud-marketplace/:providerId                    → OffersPage (lista de ofertas filtrada)
/cloud-marketplace/:providerId/:offerId           → OfferDetailPage
/cloud-marketplace/:providerId/:offerId/provision → ProvisioningPage (formulário → adiciona ao carrinho)
/deployments                                      → DeploymentsListPage (histórico de lotes)
/deployments/:batchId                             → DeploymentPage (detalhe de um lote)
```

`ProvisioningPage` não provisiona diretamente — ela chama `addItem()` no `CartContext`. As chamadas reais de provisionamento acontecem no `CartDrawer` via `provisionAll`. Ao concluir, o `CartDrawer` salva o lote no `DeploymentHistoryContext` e navega para `/deployments/:batchId`.

### Fluxo de edição do carrinho

O botão "Editar" no `CartItemCard` remove o item do carrinho, fecha o drawer e navega para `ProvisioningPage` passando os parâmetros atuais via `location.state.editValues`. A `ProvisioningPage` inicializa seu `useState` de `values` a partir desse state quando presente, pré-preenchendo o formulário.

### Layout

`AppLayout` envolve todas as rotas e fornece:
- Sidebar fixa de 240px com navegação organizada por domínio:
  - **Infraestrutura**: Cloud (ativo), On-Premise (em breve)
  - **Observabilidade**: Implantações (ativo → `/deployments`), Dashboards/Métricas/Logs (em breve)
  - **Configurações**: Cadastros/Integrações/Permissões (em breve)
- O logo "Cloud Marketplace" na sidebar navega para `/` (home)
- Barra superior fixa com `GlobalSearchBar` (cross-provider, debounce de 300ms) e `CartButton` (abre `CartDrawer` como overlay à direita)
- Área de conteúdo com `padding-top: 56px` (altura da barra superior)

### Estrutura de componentes

```
src/components/
  AppLayout/          — Sidebar, TopBar, SidebarItem, SidebarUserInfo
  HomePage/           — Página inicial com módulos e tiles de acesso rápido
  infrastructure/
    cloud/            — MarketplacePage, ProviderCard
    shared/           — Cart/, OfferDetailPage/, OffersPage/, ProvisioningPage/,
                        CategoryChip, EmptyState, ProviderBadge
    onpremise/        — (futuro)
  observability/
    deployments/      — DeploymentsListPage, DeploymentPage
```

A estrutura de pastas espelha os domínios do menu lateral. Ao criar novas features de observabilidade (Dashboards, Métricas, Logs), criar em `src/components/observability/`.

### Dados mock

`src/mocks/offers.mock.json` contém 8 ofertas (Azure ×3, AWS ×3, OCI ×2) e 3 providers. O `MockMarketplaceClient.provision()` simula um delay de 1,5s e tem 10% de taxa de falha aleatória.

## Convenções importantes

- Ícones MUI devem ser importados via barrel nomeado: `import { IconName } from '@mui/icons-material'` — não imports profundos, por compatibilidade ESM com Vite.
- O tema está definido em `src/theme.ts` (paleta B3: primário `#003087`, destaque `#0050B3`, IBM Plex Sans). Aplique overrides lá, não inline.
- `OfferParameter.type` determina o campo renderizado no `ProvisioningForm`: `string` → TextField, `number` → TextField type=number, `select` → Select, `boolean` → Checkbox. O form valida on-blur por campo e on-submit.
- Ao adicionar um novo provider, atualize `offers.mock.json` e adicione seu `accentColor` — `ProviderBadge` e `ProviderCard` usam essa cor para diferenciação visual.
- `CartDrawer` usa snapshot dos itens no momento do confirm para exibir resultados, removendo do carrinho apenas os itens com sucesso. Itens com falha permanecem no carrinho para retry.

## Integração com Backstage (iframe)

O app é embutido no Backstage via `<iframe src="http://localhost:5173/cloud-marketplace">` dentro de um `PageBlueprint`. O Vite sobe em `:5173` e o Backstage em `:3000`. Ver `README.md` para o passo a passo completo de setup.

Mantenha os contratos de API em `MarketplaceApi.ts` limpos — quando existir um backend real, ele deve ser um substituto direto de `MockMarketplaceClient` sem alterações na interface.

O `DeploymentHistoryContext` também está preparado para migração: quando houver backend, `addBatch` passa a fazer um POST e `getBatch`/`batches` passam a consultar a API em vez do `localStorage`, sem mudança de contrato para os componentes consumidores.
