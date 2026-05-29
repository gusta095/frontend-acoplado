# Cloud Marketplace

Aplicação web interna para descoberta e provisionamento self-service de recursos cloud (AWS, Azure, OCI). O engenheiro navega pelas ofertas, configura parâmetros, adiciona ao carrinho e confirma o provisionamento.

> React 18 + TypeScript + Vite 5 + MUI v5. Roda standalone ou embutido no Backstage via iframe.

---

## Rodando standalone

```bash
npm install
npm run dev
# Acesse http://localhost:5173
```

Os dados são servidos pelo mock em `src/mocks/offers.mock.json`.

```bash
npm run build   # build de produção
npm run preview # preview do build
```

---

## Integração com o Backstage (abordagem iframe)

A integração atual **não** converte o app em plugin nativo — ele continua rodando como servidor Vite independente (`:5173`) e é embutido dentro do Backstage via `<iframe>`. Isso mantém o frontend totalmente desacoplado do monorepo do Backstage.

---

### Estrutura no monorepo

O app foi copiado para dentro do workspace Yarn do Backstage:

```
gusta-lab/
└── packages/
    └── cloud-marketplace/   ← este app
└── packages/app/
    └── src/modules/cloudMarketplace/
        ├── CloudMarketplacePage.tsx  ← componente Backstage com o <iframe>
        └── index.ts                  ← plugin Backstage que registra a página
```

---

### Passo 1 — Copiar o app para o workspace

Copie o conteúdo deste repo para `gusta-lab/packages/cloud-marketplace/`. O `package.json` deve ter o nome de workspace:

```json
{ "name": "@internal/cloud-marketplace" }
```

O `gusta-lab/package.json` já inclui `"packages/*"` nos workspaces, então o app é reconhecido automaticamente.

---

### Passo 2 — Versão do Vite

O projeto usa **Vite 8** (com Rolldown). O erro `ReferenceError: init_emotion_react_browser_development_esm is not defined` descrito anteriormente ocorre quando o Rolldown divide o bundle em múltiplos chunks com ordem de inicialização errada para MUI/Emotion. **No build atual isso não acontece** porque o output é um único bundle (558 KB).

> **Atenção:** não habilite `build.rolldownOptions.output.codeSplitting` nem `build.rollupOptions.output.manualChunks` sem validar que o app continua funcionando no Backstage. Essas opções reintroduzem o risco de chunk ordering com MUI/Emotion.

---

### Passo 3 — Configurar o vite.config.ts

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // necessário para WSL2: garante acesso do browser Windows
    port: 5173,
  },
})
```

> **Por que `host: '0.0.0.0'`?** No WSL2 os servidores em `127.0.0.1` ficam presos no loopback interno do Linux e podem não ser acessíveis do browser Windows. Usando `0.0.0.0` o servidor escuta em todas as interfaces.

> **Não usar `optimizeDeps.exclude: ['@mui/icons-material']`** — esse exclude faz o Vite servir o barrel do MUI Icons sem pré-bundle, gerando ~2.650 requisições HTTP individuais no browser e travando o carregamento.

---

### Passo 4 — Criar o componente iframe no Backstage

`gusta-lab/packages/app/src/modules/cloudMarketplace/CloudMarketplacePage.tsx`:

```tsx
export function CloudMarketplacePage() {
  return (
    <iframe
      src="http://localhost:5173/cloud-marketplace"
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

### Passo 5 — Criar o plugin Backstage

`gusta-lab/packages/app/src/modules/cloudMarketplace/index.ts`:

```ts
import CloudIcon from '@material-ui/icons/Cloud';
import { createElement } from 'react';
import { createFrontendPlugin, PageBlueprint } from '@backstage/frontend-plugin-api';

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
  pluginId: 'cloud-marketplace',   // ← campo é "pluginId", não "id" (API Backstage >= 1.49)
  extensions: [cloudMarketplacePage],
});
```

---

### Passo 6 — Registrar no App.tsx do Backstage

`gusta-lab/packages/app/src/App.tsx`:

```ts
import { cloudMarketplacePlugin } from './modules/cloudMarketplace';

export default createApp({
  features: [..., cloudMarketplacePlugin],
});
```

---

### Passo 7 — Liberar o iframe no CSP

`gusta-lab/app-config.yaml`:

```yaml
backend:
  csp:
    frame-src: ["'self'", 'http://localhost:5173']
```

Sem essa entrada o Backstage bloqueia o carregamento do iframe por Content Security Policy.

---

### Passo 8 — Instalar dependências e subir

```bash
# Na raiz do monorepo Backstage
cd gusta-lab
yarn install
yarn start
```

O script `start` usa `concurrently` para subir os dois servidores simultaneamente:
- Backstage frontend em `:3000` e backend em `:7007`
- Cloud Marketplace Vite em `:5173`

> **Não use `yarn dev`** — ele sobe apenas o Backstage, sem o servidor Vite do Cloud Marketplace.

---

### Verificando se está tudo certo

| Checklist | Como verificar |
|-----------|---------------|
| Vite em `0.0.0.0:5173` | `ss -tlnp \| grep 5173` → deve mostrar `0.0.0.0:5173` |
| App standalone funcionando | Abrir `http://localhost:5173` no browser Windows |
| App no Backstage | Abrir `http://localhost:3000/cloud-marketplace` |

---

## Stack

| Tecnologia | Versão | Observação |
|-----------|--------|------------|
| React | 18 | |
| TypeScript | 5 | |
| **Vite** | **5** | **Não usar v8 — bug com MUI/Emotion/Rolldown** |
| Material UI | 5 | |
| React Router | 6 | Usado apenas no app standalone |
| IBM Plex Sans | — | Tipografia |

---

## Integração nativa (futuro)

A abordagem iframe é intencional para manter o frontend desacoplado. Quando houver necessidade de integração mais profunda (autenticação compartilhada, acesso às APIs do Backstage, tema unificado), consulte o `SDD.md` para o plano de migração para plugin nativo com `MarketplaceClient` HTTP substituindo o `MockMarketplaceClient`.
