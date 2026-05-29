# User Stories e Fluxo do Usuário

---

## Personas

**Engenheiro de Plataforma (Admin)**
> Responsável por cadastrar e manter as ofertas disponíveis por provider. (Fora do escopo da UI v0.1 — gerenciado via JSON/config)

**Engenheiro de Software / Dev (Consumidor)**
> Quer provisionar recursos cloud de forma rápida, sem precisar escrever IaC do zero.

---

## Épico 1 — Navegação e Descoberta

```
US-01
Como engenheiro,
Quero ver os providers disponíveis na página inicial do marketplace,
Para escolher de qual cloud eu quero provisionar um recurso.

Critério: A página exibe cards para Azure, AWS e OCI com seus logos e a quantidade de ofertas disponíveis em cada um.
```

```
US-02
Como engenheiro,
Quero clicar em um provider e ver suas ofertas listadas,
Para entender o que posso provisionar naquele cloud.

Critério: Ao clicar em um provider, exibe uma lista/grid de ofertas com nome, descrição curta, categoria e um badge do provider.
```

```
US-03
Como engenheiro,
Quero filtrar as ofertas por categoria (ex: Compute, Storage, Networking),
Para encontrar mais facilmente o que preciso.

Critério: Filtros por categoria funcionam como chips/tags e refletem instantaneamente na listagem sem reload de página.
```

```
US-04
Como engenheiro,
Quero buscar ofertas pelo nome ou descrição,
Para encontrar um recurso específico rapidamente.

Critério: Campo de busca com debounce de 300ms, filtrando por nome e descrição. Exibe estado vazio se não houver resultados.
```

---

## Épico 2 — Detalhe da Oferta

```
US-05
Como engenheiro,
Quero clicar em uma oferta e ver sua página de detalhe,
Para entender o que esse recurso faz antes de solicitar.

Critério: Página de detalhe exibe: nome, descrição longa, provider, categoria, lista de parâmetros necessários e botão "Provisionar".
```

```
US-06
Como engenheiro,
Quero ver quais parâmetros são obrigatórios e quais são opcionais,
Para entender o que preciso preencher antes de provisionar.

Critério: Parâmetros obrigatórios marcados com asterisco (*). Tooltip ou texto auxiliar por campo.
```

---

## Épico 3 — Checkout / Provisionamento

```
US-07
Como engenheiro,
Quero preencher um formulário com os parâmetros da oferta e submeter,
Para solicitar o provisionamento do recurso.

Critério: Formulário com validação em tempo real. Botão "Confirmar" desabilitado até todos os campos obrigatórios estarem preenchidos e válidos.
```

```
US-08 — ❌ Descartada na v0.1
Como engenheiro,
Quero ver uma tela de confirmação antes de provisionar,
Para revisar os dados antes de submeter.

Decisão: removida da v0.1. O fluxo de revisão foi absorvido pelo CartDrawer —
o usuário revisa todos os pedidos com seus parâmetros antes de confirmar o
provisionamento em lote. Após a confirmação, o CartDrawer salva o lote no
DeploymentHistoryContext e navega para /deployments/:batchId.
```

```
US-09
Como engenheiro,
Quero receber feedback visual após submeter,
Para saber se o provisionamento foi aceito ou falhou.

Critério: Estado de loading durante a chamada. Toast/banner de sucesso com mensagem de confirmação, ou mensagem de erro com causa. Ambos acessíveis via screen reader (aria-live).
```

---

## Épico 5 — Histórico de Implantações

```
US-13
Como engenheiro,
Quero ver uma lista de todos os lotes de provisionamento que já confirmei,
Para ter rastreabilidade do que foi solicitado e quando.

Critério: Página /deployments exibe todos os lotes em ordem cronológica inversa,
com número do lote, data/hora, quantidade de pedidos, contagem de sucesso/falha
e chips com os nomes das ofertas do lote.
```

```
US-14
Como engenheiro,
Quero clicar em um lote e ver o detalhe de cada pedido,
Para saber o status individual, o request ID e a mensagem retornada.

Critério: Página /deployments/:batchId exibe o ID do lote, data/hora, total de
pedidos e, para cada item: nome da oferta, badge do provider, parâmetros
preenchidos, status (Confirmado/Falhou), requestId e mensagem.
```

```
US-15
Como engenheiro,
Quero que o histórico persista entre sessões do navegador,
Para não perder o rastreamento ao fechar e reabrir o app.

Critério: Os dados de DeploymentHistoryContext são salvos em localStorage
com a chave cloud-marketplace:deployment-history e recarregados ao inicializar.
```

---

## Épico 4 — Carrinho de Pedidos

```
US-10
Como engenheiro,
Quero adicionar uma oferta configurada ao carrinho antes de provisionar,
Para revisar e confirmar múltiplos pedidos de uma só vez.

Critério: Botão "Adicionar ao Carrinho" no final do formulário de parâmetros.
O item entra no carrinho com os parâmetros preenchidos. O ícone do carrinho
no topo atualiza o contador.
```

```
US-11
Como engenheiro,
Quero abrir o carrinho e ver todos os pedidos pendentes,
Para revisar o que estou prestes a provisionar antes de confirmar.

Critério: Painel lateral (drawer) exibe lista de itens com nome da oferta,
provider, parâmetros preenchidos e opção de remover cada item.
Botão "Confirmar todos os pedidos" dispara o provisionamento em sequência.
```

```
US-12
Como engenheiro,
Quero remover um item do carrinho,
Para desistir de um pedido sem perder os outros.

Critério: Botão de remoção por item. Carrinho vazio exibe EmptyState.
```

---

## Fluxo Completo (Happy Path)

```
[AppLayout — sempre visível]
 ├── Sidebar esquerda com navegação
 ├── GlobalSearchBar no topo
 └── CartButton com contador no canto superior direito

        │
        ▼
[HomePage /] ← logo na sidebar ou acesso direto
 ├── Cards de módulos: Cloud Marketplace, Implantações, Configurações
 └── Tiles de acesso rápido (stats: providers, ofertas, carrinho)
        │
        ▼
[Home do Marketplace] ← módulo "Cloud Marketplace" ou menu "Cloud" na sidebar
        │
        ▼
  Seleciona Provider (ex: AWS)
  — OU usa GlobalSearchBar para busca direta —
        │
        ▼
  [Listagem de Ofertas do Provider]
   └── Filtra por categoria (opcional)
        │
        ▼
  Clica em uma Oferta (ex: S3 Bucket)
        │
        ▼
  [Página de Detalhe da Oferta]
   └── Lê descrição, parâmetros, pré-requisitos
        │
        ▼
  Clica em "Configurar e Adicionar"  ← botão chama-se assim no código (spec dizia "Provisionar")
        │
        ▼
  [Formulário de Parâmetros]
   └── Preenche campos obrigatórios e opcionais
        │
        ▼
  Clica em "Adicionar ao Carrinho"
        │
        ▼
  [Carrinho atualizado — contador +1]
   └── Usuário pode continuar navegando ou abrir o carrinho
        │
        ▼
  Abre CartDrawer (ícone no topo)
        │
        ▼
  [Carrinho / Revisão de Pedidos]
   ├── Lista todos os itens com parâmetros
   ├── Remove itens (opcional)
   └── "Confirmar todos os pedidos"
        │
        ▼
  [Estado de Loading por item]
        │
   ┌────┴────┐
   ▼         ▼
Sucesso    Erro
           (item permanece no carrinho para retry)
        │
        ▼
  [Salva lote no DeploymentHistoryContext]
        │
        ▼
  Navega para /deployments/:batchId
        │
        ▼
  [DeploymentPage — detalhe do lote]
   ├── ID do lote, data/hora, total de pedidos
   ├── Por item: status, requestId, mensagem, parâmetros
   └── Botões: "Novo provisionamento" e "Ver histórico"
        │
        ▼
  [DeploymentsListPage /deployments] ← menu "Implantações" na sidebar
   └── Lista de todos os lotes com status e chips de ofertas
```