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

---

## Origem dos templates

O portal lê os templates de infraestrutura de duas fontes possíveis, configuráveis em **Configurações → Templates** na interface.

### Modo GitHub (padrão / produção)

O Vite faz proxy das chamadas `/github-api/*` para `api.github.com`. Para repositórios privados, exporte o token antes de subir o dev server:

```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
npm run dev
```

Na tela de Templates, preencha:

| Campo | Exemplo |
|---|---|
| Organização / Usuário | `minha-org` |
| Repositório | `platform-templates-offers` |
| Branch | `main` |
| Caminho dos Templates | `templates` |

Clique **Aplicar** — o portal vai verificar a conexão e listar os providers encontrados.

> Sem token o GitHub permite até 60 req/h para repositórios públicos. Para privados o token é obrigatório.

---

### Modo Local (desenvolvimento)

Use este modo para testar templates localmente sem precisar fazer push para o GitHub.

**1. Clone o repositório de templates**

```bash
git clone https://github.com/minha-org/platform-templates-offers.git ~/projetos/platform-templates-offers
```

**2. Configure o apontamento local**

Acesse **Configurações → Templates**, selecione **Pasta Local** e informe o caminho até a pasta `templates/`:

```
/home/seu-usuario/projetos/platform-templates-offers/templates
# ou usando ~
~/projetos/platform-templates-offers/templates
```

Clique **Aplicar**. O portal verifica o caminho e lista os providers encontrados.

> **Atenção:** aponte para a pasta `templates/` (não para a raiz do repo). Se apontar para a raiz, o portal vai detectar e exibir uma mensagem de erro orientando a correção.

---

## Como funciona o provisionamento

O portal é agnóstico à infraestrutura — ele não sabe o que o workflow faz, só dispara e observa o resultado.

### Divisão de responsabilidades

| Responsabilidade | Portal | Workflow (repo de templates) |
|---|:---:|:---:|
| Ler `template.yaml` e montar o formulário | ✅ | |
| Validar os parâmetros preenchidos pelo usuário | ✅ | |
| Montar o payload com parâmetros, provider e definição de produto | ✅ | |
| Disparar o workflow via `repository_dispatch` | ✅ | |
| Fazer polling do GitHub Actions e exibir status | ✅ | |
| Identificar se o repositório já existe ou criar um novo | | ✅ |
| Renderizar arquivos do skeleton com os parâmetros | | ✅ |
| Executar Terraform / Ansible / qualquer IaC | | ✅ |
| Configurar secrets, permissões e infraestrutura | | ✅ |

### Repositórios envolvidos

| Repositório | Papel |
|---|---|
| **Repo de templates** | Configurado em Configurações → Templates. Contém os `template.yaml` com a definição das ofertas e os workflows de provisionamento. O portal lê os templates daqui e dispara os workflows aqui. |
| **Repo de destino** | Criado pelo workflow com o nome informado no campo `repo_name` do formulário. O portal apenas acompanha o status via polling. |

### Fluxo

1. **Leitura** — o portal busca todos os `template.yaml` do repo de templates e renderiza os formulários com os parâmetros definidos neles.
2. **Dispatch** — ao confirmar o provisionamento, o portal envia um `repository_dispatch` para o repo de templates com o event type `provision` e um payload contendo `repo_name`, `offer_id`, `org` e os parâmetros preenchidos.
3. **Execução** — o workflow no repo de templates recebe o evento, renderiza o skeleton com os parâmetros e cria ou atualiza o repo de destino (se já existir, substitui os arquivos e commita; se não existir, cria e faz o push inicial). O push dispara o `terraform.yml` dentro do repo de destino.
4. **Polling** — o portal consulta periodicamente a API do GitHub Actions no repo de destino e exibe os steps em tempo real na tela de implantações.

### Contrato do `repository_dispatch`

O portal sempre dispara o evento com este formato:

```json
{
  "event_type": "provision",
  "client_payload": {
    "repo_name": "nome-do-repo-a-criar",
    "offer_id": "id-da-oferta",
    "org": "minha-org",
    "params": {
      "parametro_1": "valor",
      "parametro_2": "valor"
    }
  }
}
```

O workflow deve escutar `on: repository_dispatch: types: [provision]` e acessar os valores via `github.event.client_payload`.

---

## Integração com Backstage

O app é embutido no Backstage via `<iframe src="http://localhost:5173/cloud-marketplace">` dentro de um `PageBlueprint`. O Vite sobe em `:5173` e o Backstage em `:3000`.

Ver `.specs/07-seguranca.md` para os princípios de segurança.

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
