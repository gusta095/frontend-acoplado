# CLAUDE.md

Este arquivo fornece orientações ao Claude Code (claude.ai/code) ao trabalhar com o código deste repositório.

## Visão Geral do Projeto

**Cloud Marketplace** é uma SPA React standalone (Vite) que funciona como um portal self-service para provisionamento de recursos cloud. Engenheiros navegam por ofertas de providers (AWS, Azure, OCI), configuram parâmetros e submetem pedidos de provisionamento usando a metáfora de carrinho/checkout. O app é projetado para futura integração como plugin Backstage — os contratos de API e a estrutura de rotas refletem isso.

## Comandos

```bash
npm run dev       # Inicia o servidor de desenvolvimento (localhost:5173)
npm run build     # Verificação TypeScript + build de produção Vite
npm run lint      # ESLint
npm run preview   # Preview do build de produção
```

Não há testes configurados ainda (`yarn test` é mencionado no SDD mas não existe no package.json).

## Arquitetura

### Padrão de acesso a dados

Todo acesso a dados passa pela interface `MarketplaceApi` (`src/api/MarketplaceApi.ts`). A única implementação atual é `MockMarketplaceClient` (`src/api/MockMarketplaceClient.ts`), que lê de `src/mocks/offers.mock.json` com delays assíncronos simulados. Cada hook instancia `MockMarketplaceClient` diretamente — não há injeção de dependência ou contexto para o cliente ainda.

### Estado global

Apenas `CartContext` (`src/context/CartContext.tsx`) é estado global. Todo o resto é `useState`/`useReducer` local por página. O carrinho é apenas em memória (sem persistência).

### Hooks

Cada hook (`useProviders`, `useOffers`, `useOfferDetail`, `useProvisioning`) tem sua própria instância de `MockMarketplaceClient`. `useProvisioning` expõe tanto `provision` (individual) quanto `provisionAll` (lote sequencial, usado pelo `CartDrawer`).

### Roteamento

Todas as rotas ficam sob `/cloud-marketplace`:

```
/cloud-marketplace                                → MarketplacePage (grid de providers)
/cloud-marketplace/:providerId                    → OffersPage (lista de ofertas filtrada)
/cloud-marketplace/:providerId/:offerId           → OfferDetailPage
/cloud-marketplace/:providerId/:offerId/provision → ProvisioningPage (formulário → adiciona ao carrinho)
```

`ProvisioningPage` não provisiona diretamente — ela chama `addItem()` no `CartContext`. As chamadas reais de provisionamento acontecem no `CartDrawer` via `provisionAll`.

### Layout

`AppLayout` envolve todas as rotas e fornece:
- Sidebar fixa de 240px com navegação (apenas a rota "Cloud" está ativa; as demais exibem tooltip "Em breve")
- Barra superior fixa com `GlobalSearchBar` (cross-provider, debounce de 300ms) e `CartButton` (abre `CartDrawer` como overlay à direita)
- Área de conteúdo com `padding-top: 56px` (altura da barra superior)

### Dados mock

`src/mocks/offers.mock.json` contém 8 ofertas (Azure ×3, AWS ×3, OCI ×2) e 3 providers. O `MockMarketplaceClient.provision()` simula um delay de 1,5s e tem 10% de taxa de falha aleatória.

## Convenções importantes

- Ícones MUI devem ser importados via barrel nomeado: `import { IconName } from '@mui/icons-material'` — não imports profundos, por compatibilidade ESM com Vite.
- O tema está definido em `src/theme.ts` (paleta B3: primário `#003087`, destaque `#0050B3`, IBM Plex Sans). Aplique overrides lá, não inline.
- `OfferParameter.type` determina o campo renderizado no `ProvisioningForm`: `string` → TextField, `number` → TextField type=number, `select` → Select, `boolean` → Checkbox.
- Ao adicionar um novo provider, atualize `offers.mock.json` e adicione seu `accentColor` — `ProviderBadge` e `ProviderCard` usam essa cor para diferenciação visual.

## Integração futura (Backstage)

O SDD (`SDD.md`) documenta a integração planejada como plugin Backstage. Mantenha os contratos de API em `MarketplaceApi.ts` limpos — quando existir um backend real, ele deve ser um substituto direto de `MockMarketplaceClient` sem alterações na interface. Os endpoints REST do backend estão documentados na seção 4.4 do SDD.
