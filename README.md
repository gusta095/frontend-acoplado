# Cloud Marketplace

Aplicação web interna para descoberta e provisionamento self-service de recursos cloud (AWS, Azure, OCI). O engenheiro navega pelas ofertas, configura parâmetros, adiciona ao carrinho e confirma o provisionamento.

> React 18 + TypeScript + Vite 8 + MUI v5. Roda standalone em `:5173` e é embutido no Backstage via `<iframe>`.

---

## Rodando standalone

```bash
npm install
npm run dev
# Acesse http://localhost:5173
```

```bash
npm run build   # build de produção
npm run preview # preview do build
```

Os dados são servidos pelo mock em `src/mocks/offers.mock.json`.

---

## Integração com Backstage

Ver `.specs/08-integracao-backstage.md` para a documentação completa da integração e `.specs/07-seguranca.md` para os princípios de segurança.

O guia passo a passo para fazer a integração está em `SETUP-BACKSTAGE.md`.

---

## Stack

| Tecnologia | Versão |
|---|---|
| React | 18 |
| TypeScript | 5 / 6 |
| Vite | 8 (Rolldown) |
| Material UI | 5 |
| React Router | 7 |
| IBM Plex Sans | — |
