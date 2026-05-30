# Integrando o Cloud Marketplace no Backstage

Este guia assume que você já tem um Backstage rodando localmente.

---

## 1. Copie o app para dentro do Backstage

```bash
cp -r /caminho/para/cloud-marketplace /caminho/para/backstage/packages/cloud-marketplace
```

Remova arquivos desnecessários dentro de `packages/cloud-marketplace/`:

```bash
rm -rf node_modules dist .git
```

---

## 2. Renomeie o pacote

Em `packages/cloud-marketplace/package.json`, mude o campo `name`:

```json
"name": "@internal/cloud-marketplace"
```

Adicione o script `start` nos scripts:

```json
"scripts": {
  "start": "vite",
  ...
}
```

---

## 3. Configure o Vite para WSL2

Em `packages/cloud-marketplace/vite.config.ts`, adicione `server`:

```ts
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
```

> Sem `host: '0.0.0.0'` o servidor fica preso no loopback do Linux e não fica acessível pelo browser Windows.

---

## 4. Crie o componente iframe

Crie o arquivo `packages/app/src/modules/cloudMarketplace/CloudMarketplacePage.tsx`:

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

---

## 5. Crie o plugin Backstage

Crie o arquivo `packages/app/src/modules/cloudMarketplace/index.ts`:

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
  pluginId: 'cloud-marketplace',
  extensions: [cloudMarketplacePage],
});
```

---

## 6. Registre o plugin no App.tsx

Em `packages/app/src/App.tsx`, importe e adicione o plugin:

```ts
import { cloudMarketplacePlugin } from './modules/cloudMarketplace';

export default createApp({
  features: [..., cloudMarketplacePlugin],
});
```

---

## 7. Adicione o botão na sidebar

Em `packages/app/src/modules/nav/Sidebar.tsx`, adicione o import e o item:

```ts
import CloudIcon from '@material-ui/icons/Cloud';
```

```tsx
<SidebarItem icon={CloudIcon} to="/cloud-marketplace" text="Cloud Marketplace" />
```

---

## 8. Libere o iframe no CSP

Em `app-config.yaml`, adicione `frame-src` dentro de `backend.csp`:

```yaml
backend:
  csp:
    connect-src: ["'self'", 'http:', 'https:']
    frame-src: ["'self'", 'http://localhost:5173']
```

---

## 9. Configure o start do monorepo

Instale o `concurrently` na raiz do monorepo:

```bash
yarn add concurrently --dev
```

Em `package.json` da raiz, atualize o script `start`:

```json
"start": "concurrently --names \"backstage,vite\" --prefix-colors \"blue,green\" \"backstage-cli repo start\" \"npm --prefix ../../frontend-acoplado run dev\""
```

> Ajuste o caminho `../../frontend-acoplado` para apontar para onde o app está no seu sistema.

---

## 10. Instale as dependências e suba

```bash
yarn install
yarn start
```

Aguarde os dois servidores subirem:
- **Backstage** → `http://localhost:3000`
- **Cloud Marketplace (Vite)** → `http://localhost:5173`

Acesse `http://localhost:3000/cloud-marketplace`.

---

## Verificação rápida

| O quê | Como checar |
|---|---|
| Vite está rodando | Abrir `http://localhost:5173` no browser |
| Backstage está rodando | Abrir `http://localhost:3000` no browser |
| Integração funcionando | Clicar em "Cloud Marketplace" na sidebar do Backstage |
| Vite acessível no WSL2 | `ss -tlnp \| grep 5173` deve mostrar `0.0.0.0:5173` |

---

## Problemas comuns

**Tela branca no iframe**
O Vite está resolvendo pacotes do `node_modules` hoistado pelo Yarn workspace, o que causa um bug do Rolldown com MUI/Emotion. A solução (já aplicada no script `start`) é rodar o Vite do diretório standalone do app, que tem seus próprios `node_modules` isolados.

**Conexão recusada**
O Vite não subiu. Verifique se o processo `vite` está rodando e se a porta 5173 está aberta (`ss -tlnp | grep 5173`).

**Iframe bloqueado**
Verifique se o `frame-src` foi adicionado corretamente no `app-config.yaml` e se o Backstage foi reiniciado após a mudança.
