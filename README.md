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

O papel do portal é **enviar uma requisição ao GitHub e fazer polling do resultado**. Toda a execução de infraestrutura acontece fora do portal, dentro do GitHub Actions.

### Dois repositórios envolvidos

| Repositório | Papel |
|---|---|
| **Repo de templates** | Configurado em Configurações → Templates. Contém os `template.yaml` e os arquivos do `skeleton/`. O portal lê daqui. |
| **Repo de destino** | Criado em tempo de provisionamento com o nome informado no campo `repo_name` do formulário. O portal escreve aqui. |

### Fluxo

1. **Leitura** — o portal busca o `template.yaml` do repo de templates e renderiza o formulário com os parâmetros definidos nele.
2. **Provisionamento** — ao confirmar, o portal:
   - Cria o repo de destino no GitHub (na org configurada em Configurações → Integrações, ou no perfil pessoal do token se não houver org).
   - Faz commit dos arquivos do `skeleton/` com os parâmetros interpolados.
   - O GitHub Actions dispara automaticamente ao detectar o commit.
3. **Polling** — o portal consulta periodicamente a API do GitHub Actions para acompanhar o status do workflow e exibe o resultado em tempo real na tela de implantações.

O Terraform, Ansible ou qualquer ferramenta de IaC roda **dentro do GitHub Actions** — o portal não sabe nem se importa com o que acontece lá dentro, só observa se o workflow terminou com sucesso ou falha.

---

## DevTools (temporário)

> **Atenção:** esta seção descreve funcionalidade temporária de desenvolvimento. Remover antes de produção.

Acesse **Configurações → DevTools** para habilitar comportamentos alternativos durante testes.

### Reutilizar repositório existente

Por padrão, cada provisionamento cria um repositório novo no GitHub. Para evitar acúmulo de repos durante testes, é possível apontar para um repo fixo:

1. Ative o toggle **Reutilizar repositório existente**.
2. Informe o nome do repo no campo abaixo (ex: `meu-repo-de-teste`).

Com a opção ativa, o portal **pula a criação do repositório** e faz o commit diretamente no repo informado, substituindo os arquivos a cada execução. O restante do fluxo (blobs, tree, commit, trigger do GitHub Actions) permanece idêntico.

> O repo de reuso deve existir previamente e pertencer ao mesmo owner configurado em Configurações → Integrações.

**Como remover:** buscar `[DEVTOOLS]` no código — há 4 ocorrências em `DevToolsPage.tsx`, `Sidebar.tsx`, `App.tsx` e `provisionToGitHub.ts`.

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
