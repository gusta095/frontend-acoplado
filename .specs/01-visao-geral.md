# Visão Geral e Objetivos

> **Projeto:** Cloud Marketplace  
> **Versão:** 0.1.0  
> **Status:** Implementado ✅  
> **Autores:** GustaLab  

---

## Contexto

O **Cloud Marketplace** é uma aplicação web interna que funciona como uma loja de recursos de cloud. Engenheiros e times de produto podem navegar por ofertas de providers de cloud (Azure, AWS, OCI), explorar os detalhes de cada recurso e solicitar o provisionamento de forma guiada, sem precisar conhecer os detalhes de infraestrutura subjacente.

A metáfora central é a de um **e-commerce**: providers são categorias/lojas, ofertas são produtos, e o provisionamento é o "checkout".

> **Nota de arquitetura:** A v0.1 foi implementada como aplicação React standalone (Vite). A integração como plugin Backstage é planejada para versões futuras, aproveitando os contratos de API e tipos já definidos neste SDD.

---

## Objetivos

| # | Objetivo | Métrica de Sucesso |
|---|----------|--------------------|
| O1 | Permitir descoberta self-service de recursos cloud disponíveis | Usuário consegue encontrar e visualizar uma oferta em menos de 3 cliques |
| O2 | Padronizar e abstrair a experiência de provisionamento entre providers | Fluxo de checkout idêntico independente do provider |
| O3 | Entregar UI funcional como aplicação standalone, preparada para futura integração ao Backstage | App roda sem erros em `npm run dev`; contratos de API compatíveis com Backstage |
| O4 | Dar visibilidade sobre o que está disponível antes de provisionar | Página de detalhe com todas as informações relevantes da oferta |

---

## Fora de Escopo (v0.1)

- Implementação do backend de provisionamento (tratado como stub/mock)
- Autenticação e autorização granular por time/namespace
- Billing e estimativa de custo em tempo real
- Histórico de provisionamentos (catálogo de instâncias)
- Providers além de Azure, AWS e OCI

---

## Premissas Técnicas

- **Stack:** React 18 + TypeScript, Vite 8, Material UI v5, React Router v6
- **Ícones:** `@mui/icons-material` — importados via barrel ESM (`import { X } from '@mui/icons-material'`) para compatibilidade com Vite
- **Tema:** MUI Theme customizado com paleta B3 (`theme.ts`) — override global de cores, tipografia (IBM Plex Sans) e componentes
- **Dados:** Consumidos de `src/mocks/offers.mock.json` via `MockMarketplaceClient` — sem chamadas HTTP reais na v0.1
- **Rota base:** `/cloud-marketplace`
- **Estado do carrinho:** `CartContext` (React Context) em memória — sem persistência na v0.1
- **Estado local:** `useState` / `useReducer` por página — sem Redux

---

## Identidade Visual

- **Paleta de cores:** Inspirada no layout da B3 (Brasil Bolsa Balcão) — fundo branco, azul primário profundo (`#003087`), azul de destaque (`#0050B3`), sem cores fora dessa família exceto os `accentColor` dos providers
- **Tipografia:** IBM Plex Sans (Google Fonts) — 400/500/600/700/800; aplicada via MUI theme override
- **Tom visual:** Clean, institucional, profissional — sem gradientes agressivos ou elementos decorativos excessivos
