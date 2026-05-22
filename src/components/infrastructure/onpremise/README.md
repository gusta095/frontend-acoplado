# On-Premise — Guia de Implementação

Esta pasta é o domínio do time de on-premise. Quando chegar a hora de implementar, siga o padrão já estabelecido pelo time de cloud.

---

## O que já existe e pode ser reutilizado

Tudo em `infrastructure/shared/` é genérico e funciona para qualquer tipo de infraestrutura:

- **`Cart/`** — carrinho de pedidos completo (add, remove, provisionar em lote)
- **`OffersPage/`** — listagem de ofertas com filtro por categoria e busca
- **`OfferDetailPage/`** — página de detalhe com parâmetros e link de documentação
- **`ProvisioningPage/`** — formulário dinâmico com validação e tipos (string, number, select, boolean)
- **`ProviderBadge`** — chip visual de provider (adicione as cores dos providers on-premise em `src/types/index.ts`)
- **`CategoryChip`**, **`EmptyState`** — componentes de UI genéricos

Você **não duplica nada disso**. Só cria o que for específico de on-premise.

---

## O que criar aqui

```
onpremise/
  MarketplacePage/
    MarketplacePage.tsx   # Grid com os providers on-premise (VMware, Proxmox, Bare Metal...)
    ProviderCard.tsx      # Card clicável — mesma interface do cloud/MarketplacePage/ProviderCard
  shared/
    GlobalSearchBar.tsx   # Busca cross-provider on-premise (baseie-se no cloud/shared/GlobalSearchBar)
```

---

## Passos para adicionar um novo provider on-premise

1. **Adicionar o provider em `src/types/index.ts`** — estenda `ProviderId` com o novo id (ex: `'vmware'`)
2. **Adicionar as ofertas em `src/mocks/offers.mock.json`** — providers e ofertas seguem o mesmo schema que cloud
3. **Adicionar o nome em `src/constants/providers.ts`** — `vmware: 'VMware vSphere'`
4. **Criar rota em `src/App.tsx`** — seguindo o padrão `/on-premise/:providerId/:offerId/...`
5. **Implementar `MarketplacePage`** — grid dos providers on-premise, análogo ao `cloud/MarketplacePage`
6. **Ativar o item "On-Premise" na sidebar** — em `AppLayout/Sidebar.tsx`, remover o `disabled` do item e apontar para a rota

---

## Contratos de dados

O schema de `Offer` e `OfferParameter` é o mesmo para cloud e on-premise — veja `src/types/index.ts`. O formulário de provisionamento já sabe renderizar `string`, `number`, `select` e `boolean` automaticamente a partir dos parâmetros definidos no JSON.

A interface `MarketplaceApi` (`src/api/MarketplaceApi.ts`) define os métodos que o cliente on-premise precisará implementar quando houver backend real.
