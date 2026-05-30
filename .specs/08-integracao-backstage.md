# Integração com Backstage

> Contexto para IAs: este documento descreve em detalhes como o Cloud Marketplace está integrado ao Backstage, quais arquivos foram criados/modificados, decisões de arquitetura e problemas conhecidos. Use este documento antes de sugerir qualquer mudança que envolva a integração.

---

## Abordagem: iframe, não plugin nativo

O app **não** é um plugin Backstage nativo (não usa `createPlugin` com componentes React compilados junto ao Backstage). Em vez disso:

- O Vite sobe independentemente em `:5173` com seu próprio servidor de desenvolvimento
- O Backstage registra uma página em `/cloud-marketplace` que renderiza um `<iframe src="http://localhost:5173">`
- Os dois processos sobem em paralelo via `concurrently` no script `yarn start` do monorepo

**Por que iframe e não plugin nativo:**
- Mantém o frontend totalmente desacoplado do ciclo de build do Backstage (webpack/rspack)
- Evita conflitos de versão entre as dependências do Backstage (React 18, MUI v4/v5, @material-ui) e as do app
- Permite desenvolver e testar o app standalone sem precisar do Backstage rodando

---

## Repositórios envolvidos

```
<workspace>/
├── frontend-acoplado/          ← este repositório (app standalone + source of truth)
└── backstage/                  ← monorepo Backstage
    ├── package.json        ← script start + concurrently
    ├── app-config.yaml     ← CSP frame-src
    └── packages/
        ├── cloud-marketplace/  ← cópia do frontend-acoplado (sincronizada manualmente)
        └── app/
            └── src/
                └── modules/
                    └── cloudMarketplace/
                        ├── CloudMarketplacePage.tsx
                        └── index.ts
```

---

## Arquivos criados/modificados no Backstage

### `backstage/package.json` — script start

```json
"scripts": {
  "start": "concurrently --names \"backstage,vite\" --prefix-colors \"blue,green\" \"backstage-cli repo start\" \"npm --prefix ../frontend-acoplado run dev\""
}
```

**Importante:** o Vite é iniciado do diretório `frontend-acoplado` (caminho relativo à raiz do monorepo Backstage), **não** do `packages/cloud-marketplace`. Isso é intencional — ver seção "Bug do Rolldown" abaixo.

---

### `backstage/app-config.yaml` — CSP

```yaml
backend:
  csp:
    connect-src: ["'self'", 'http:', 'https:']
    frame-src: ["'self'", 'http://localhost:5173']
```

Sem `frame-src`, o Backstage bloqueia o carregamento do iframe por Content Security Policy e a página fica em branco sem nenhum erro visível na UI.

---

### `packages/cloud-marketplace/` — cópia do app

Cópia do repositório `frontend-acoplado` com duas diferenças:

1. `package.json` — nome alterado para workspace Yarn:
```json
{ "name": "@internal/cloud-marketplace" }
```

2. Script `start` adicionado:
```json
"scripts": {
  "start": "vite",
  "dev": "vite",
  ...
}
```

**Atenção:** esta cópia **não** é usada para rodar o servidor Vite no fluxo normal (por causa do bug do Rolldown). Ela existe para que o Yarn workspace reconheça o pacote. Para sincronizá-la com o repositório original, usar rsync:

```bash
rsync -av --delete \
  --exclude='node_modules' --exclude='dist' --exclude='.git' \
  --exclude='.claude' --exclude='.specs' --exclude='package-lock.json' \
  <workspace>/frontend-acoplado/ \
  <workspace>/backstage/packages/cloud-marketplace/
```

---

### `packages/app/src/modules/cloudMarketplace/CloudMarketplacePage.tsx`

```tsx
export function CloudMarketplacePage() {
  return (
    <iframe
      src="http://localhost:5173"
      title="Cloud Marketplace"
      style={{
        width: '100%',
        height: '100vh',
        border: 'none',
        display: 'block',
      }}
    />
  );
}
```

O iframe aponta para a raiz do app (`:5173`), não para `/cloud-marketplace`. O app tem sua própria sidebar e routing interno — o usuário navega dentro do iframe normalmente.

---

### `packages/app/src/modules/cloudMarketplace/index.ts`

```ts
import { createElement } from 'react';
import { createFrontendPlugin, PageBlueprint } from '@backstage/frontend-plugin-api';
import CloudIcon from '@material-ui/icons/Cloud';

const cloudMarketplacePage = PageBlueprint.make({
  name: 'cloud-marketplace',
  params: {
    path: '/cloud-marketplace',
    title: 'Cloud Marketplace',
    icon: createElement(CloudIcon),
    noHeader: true,
    loader: async () => {
      const { CloudMarketplacePage } = await import('./CloudMarketplacePage');
      return createElement(CloudMarketplacePage);
    },
  },
});

export const cloudMarketplacePlugin = createFrontendPlugin({
  pluginId: 'cloud-marketplace',  // campo correto na API Backstage >= 1.49, não "id"
  extensions: [cloudMarketplacePage],
});
```

---

### `packages/app/src/App.tsx`

```ts
import { cloudMarketplacePlugin } from './modules/cloudMarketplace';

export default createApp({
  features: [..., cloudMarketplacePlugin],
});
```

---

### `packages/app/src/modules/nav/Sidebar.tsx` — botão na sidebar

```ts
import CloudIcon from '@material-ui/icons/Cloud';
```

```tsx
<SidebarItem icon={CloudIcon} to="/cloud-marketplace" text="Cloud Marketplace" />
```

Adicionado dentro do `SidebarGroup label="Menu"`, logo após o `SidebarItem` do Scaffolder, antes do `SidebarScrollWrapper`.

---

## Bug do Rolldown com MUI/Emotion

### O que acontece

Quando o Vite 8 roda de dentro do Yarn workspace (`packages/cloud-marketplace`), o Yarn hoist os pacotes para o `node_modules` da raiz do monorepo. O Rolldown (bundler do Vite 8) cria chunks separados para `@emotion/react` e `@emotion/cache` ao resolver do diretório raiz. Isso causa um bug de ordem de inicialização:

```
Uncaught ReferenceError: init_emotion_react_browser_development_esm is not defined
```

O arquivo problemático é um chunk de deps pré-bundleadas do Vite (ex: `styles-XXX.js`) que referencia a função `init_emotion_react_browser_development_esm` antes de ela ser definida.

### Por que ocorre no workspace mas não standalone

No `frontend-acoplado` standalone, o `node_modules/` tem todos os pacotes instalados localmente e isolados. O Rolldown resolve tudo do mesmo diretório e cria os chunks em ordem correta.

No workspace, o Yarn hoist para `backstage/node_modules/` (raiz do monorepo). O Rolldown encontra os pacotes de Emotion num diretório diferente do esperado e cria um shared chunk para `emotion-cache` separado dos outros módulos de Emotion — quebrando a ordem de inicialização.

### Solução aplicada

O script `start` do monorepo não usa `yarn workspace @internal/cloud-marketplace start`. Em vez disso, roda o Vite diretamente do repositório standalone:

```json
"start": "concurrently ... \"npm --prefix ../frontend-acoplado run dev\""
```

O repositório standalone tem seu próprio `node_modules` isolado (não gerenciado pelo Yarn workspace), então o Rolldown resolve Emotion corretamente.

### O que NÃO resolve o problema

- `optimizeDeps.include` com os pacotes de Emotion — o Rolldown ainda cria o shared chunk
- Limpar o cache `.vite/deps` — o cache é recriado com o mesmo problema
- `resolve.dedupe` — não suficiente para prevenir o chunk splitting do Rolldown

### Armadilha: não habilitar code splitting

No build de produção (`vite build`), o output é um único bundle de ~558KB sem code splitting. O bug **não** manifesta em produção. Mas se alguém habilitar `build.rolldownOptions.output.codeSplitting` ou `build.rollupOptions.output.manualChunks`, o bug voltará.

---

## Sincronização entre repositórios

O `packages/cloud-marketplace` no Backstage é uma cópia do `frontend-acoplado`. Não é sincronizado automaticamente.

**Quando sincronizar:** sempre que houver mudanças no `frontend-acoplado` que precisem estar disponíveis no contexto do workspace (ex: atualização de dependências no `package.json`).

**Como sincronizar:**

```bash
rsync -av --delete \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.git' \
  --exclude='.claude' \
  --exclude='.specs' \
  --exclude='package-lock.json' \
  --exclude='CLAUDE.md' \
  --exclude='README.md' \
  --exclude='SETUP-BACKSTAGE.md' \
  <workspace>/frontend-acoplado/ \
  <workspace>/backstage/packages/cloud-marketplace/

# Após o rsync, corrigir os dois campos específicos do workspace:
# 1. package.json: "name" deve ser "@internal/cloud-marketplace"
# 2. package.json: scripts deve ter "start": "vite"
```

Após sincronizar, rodar `yarn install` na raiz do monorepo para atualizar o lockfile.

---

## Fluxo de desenvolvimento

```
yarn start (na raiz do monorepo Backstage)
    │
    ├── backstage-cli repo start
    │     ├── Backstage frontend → :3000
    │     └── Backstage backend  → :7007
    │
    └── npm --prefix ../frontend-acoplado run dev
          └── Vite dev server → :5173 (host 0.0.0.0)

Usuário acessa :3000/cloud-marketplace
    └── Backstage renderiza <iframe src="http://localhost:5173">
          └── Vite serve o React app completo
```

---

## Considerações WSL2

O Vite precisa de `host: '0.0.0.0'` no `vite.config.ts` do `frontend-acoplado`:

```ts
server: {
  host: '0.0.0.0',
  port: 5173,
}
```

Sem isso, o servidor escuta em `127.0.0.1` (loopback interno do Linux) e não fica acessível pelo browser Windows no WSL2.

Para verificar:
```bash
ss -tlnp | grep 5173
# deve mostrar 0.0.0.0:5173, não 127.0.0.1:5173
```

---

## Integração nativa (futuro)

A abordagem iframe é intencional para esta fase. Uma migração para plugin nativo Backstage exigiria:

1. Substituir `MockMarketplaceClient` por `MarketplaceClient` HTTP real (a interface `MarketplaceApi.ts` já está preparada para isso — substituição direta sem mudar os hooks)
2. Adaptar o tema para usar o `UnifiedThemeProvider` do Backstage em vez do MUI Theme direto
3. Remover o `AppLayout` (sidebar + topbar) — a navegação passaria a ser da sidebar do Backstage
4. Usar `useApi` do Backstage para autenticação em vez de implementação própria
