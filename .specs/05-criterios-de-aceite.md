# Critérios de Aceite e Definition of Done

---

## Critérios de Aceite por User Story

| US | Critério | Testável via |
|----|----------|--------------|
| US-01 | Página `/cloud-marketplace` exibe 3 provider cards com logo, nome e contagem de ofertas | Teste de renderização (RTL) |
| US-01 | Cards exibem `offerCount` corretamente a partir dos dados do mock | Teste unitário |
| US-02 | Clicar num provider navega para `/cloud-marketplace/:providerId` | Teste de rota / E2E |
| US-02 | Grid de ofertas renderiza todos os itens do mock para o provider selecionado | Teste de renderização |
| US-03 | Selecionar categoria filtra a lista sem reload de página | Teste de interação (RTL) |
| US-03 | Múltiplos filtros de categoria são combinados com OR | Teste unitário de lógica de filtro |
| US-04 | Busca com debounce de 300ms filtra por nome e shortDescription | Teste de interação com fake timers |
| US-04 | Busca sem resultado exibe `<EmptyState>` | Teste de renderização |
| US-05 | Clicar num offer card navega para `/cloud-marketplace/:providerId/:offerId` | Teste de rota |
| US-05 | Página de detalhe exibe todos os campos do objeto `Offer` | Teste de renderização |
| US-06 | Parâmetros obrigatórios exibem asterisco (*) | Teste de snapshot / RTL |
| US-07 | Botão "Confirmar" permanece desabilitado até campos obrigatórios preenchidos | Teste de interação |
| US-07 | Validação de `pattern` e `minLength/maxLength` exibe mensagem de erro inline | Teste de interação |
| US-08 | ~~Descartada~~ — revisão absorvida pelo CartDrawer | — |
| US-09 | Estado de loading exibe `<Progress>` durante a chamada ao `provision()` | Teste com mock de API + fake timer |
| US-09 | Resposta de sucesso exibe banner com `requestId` | Teste de integração |
| US-09 | Resposta de erro exibe mensagem com motivo | Teste de integração |
| US-13 | `/deployments` exibe todos os lotes em ordem cronológica inversa com número, data, contagem e chips de ofertas | Teste de renderização |
| US-13 | Estado vazio exibe mensagem e botão "Ir para o Marketplace" | Teste de renderização |
| US-14 | `/deployments/:batchId` exibe ID, data, total de pedidos e detalhe por item (status, requestId, mensagem) | Teste de renderização |
| US-14 | ID de lote inválido exibe estado de "não encontrado" com botão "Ver histórico" | Teste de renderização |
| US-15 | Lotes persistem em `localStorage` sob a chave `cloud-marketplace:deployment-history` | Teste unitário do contexto |
| US-15 | Dados são recarregados do `localStorage` ao montar `DeploymentHistoryProvider` | Teste unitário do contexto |

---

## Definition of Done (DoD)

Um item de trabalho é considerado **Done** quando:

### Código
- [ ] Código implementado em TypeScript sem erros de compilação (`tsc --noEmit`)
- [ ] Sem uso de `any` explícito sem justificativa documentada
- [ ] Componentes com tipagem completa de props via `interface`
- [ ] Sem `console.log` de debug remanescente

### Testes
- [ ] Cobertura de testes unitários ≥ 80% por componente
- [ ] Todos os critérios de aceite da US cobertos por pelo menos 1 teste
- [ ] `yarn test` passa sem falhas

### UI/UX
- [ ] Todos os estados de UI implementados: loading, empty, error, success
- [ ] Responsividade validada em viewport ≥ 1024px
- [ ] Navegação por teclado funcional nos elementos interativos principais
- [ ] Atributos `aria-label` nos botões e elementos sem texto visível

### Integração com Backstage
- [ ] Plugin registrado e montado corretamente via `createPlugin` e `createRoutableExtension`
- [ ] Rota `/cloud-marketplace` acessível na sidebar do Backstage
- [ ] Plugin funciona com `MockMarketplaceClient` habilitado por padrão
- [ ] Nenhum erro de console ao montar o plugin em Backstage `dev` mode

### Documentação
- [ ] Interface `MarketplaceApi` documentada com JSDoc
- [ ] Tipos exportados públicos documentados

---

## Checklist de Revisão de Spec (antes de iniciar implementação)

- [ ] Todos os tipos em `types/index.ts` revisados e aprovados
- [ ] Mock JSON validado contra os tipos TypeScript
- [ ] Fluxo completo (seção 2.3) walkthrough feito com pelo menos 1 stakeholder
- [ ] Estrutura de diretórios aprovada
- [ ] Contratos de API REST revisados (mesmo que mockados)
- [ ] DoD alinhado com o time

---

## Decisões em Aberto

| # | Decisão | Opções | Status |
|---|---------|--------|--------|
| D1 | Filtragem por categoria: AND ou OR entre múltiplas categorias selecionadas? | OR | ✅ Definido |
| D2 | Como identificar o usuário que solicitou o provisionamento? | Omitir — o Backstage já autentica o usuário via sessão, o backend extrai a identidade pelo token HTTP | ✅ Definido |
| D3 | O campo de busca deve funcionar cross-provider ou apenas dentro de um provider? | Cross-provider — barra global sempre visível no topo | ✅ Definido |
| D4 | Paginação na listagem de ofertas? | Feed contínuo — todas as ofertas em grid sem paginação | ✅ Definido |
