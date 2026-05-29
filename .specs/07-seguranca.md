# Princípios de Desenvolvimento Seguro

> Este documento registra os princípios que mantêm o projeto seguro e que devem ser seguidos em todas as novas contribuições.

---

## 1. XSS — Nunca contornar as proteções do React

O React escapa automaticamente todo conteúdo renderizado via JSX. Isso cobre a grande maioria dos vetores de XSS.

**Proibido:**
```tsx
// NUNCA fazer — abre vetor de XSS direto
<div dangerouslySetInnerHTML={{ __html: userContent }} />
document.innerHTML = value;
eval(expression);
```

**Permitido:**
```tsx
// Seguro — React escapa automaticamente
<Typography>{offer.longDescription}</Typography>
```

> Se no futuro for necessário renderizar Markdown, usar uma biblioteca com sanitização integrada (ex: `react-markdown` com `rehype-sanitize`). Nunca concatenar HTML manualmente.

---

## 2. URLs externas — Sempre validar protocolo

O React **não** sanitiza atributos `href`. Uma URL com `javascript:` em um `<a href>` é executada quando o usuário clica.

**Regra:** Antes de usar qualquer URL vinda de API em um `href`, validar que o protocolo é `https:`.

```tsx
function isSafeUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

// Uso
{offer.documentationUrl && isSafeUrl(offer.documentationUrl) && (
  <Link href={offer.documentationUrl} target="_blank" rel="noopener noreferrer">
    Documentação
  </Link>
)}
```

**Sempre incluir** `rel="noopener noreferrer"` em links com `target="_blank"`.

---

## 3. localStorage — Apenas dados não-sensíveis

O `localStorage` é acessível por qualquer script rodando na página. Nunca armazenar neste projeto:

- Tokens de autenticação ou sessão
- Credenciais de qualquer natureza
- Dados pessoais (PII)

**O que está em localStorage hoje:** histórico de implantações (`DeploymentBatch`) — IDs, nomes de recursos, parâmetros de provisionamento. Nenhum dado sensível.

**Regra:** Ao adicionar novos campos ao `DeploymentBatch` ou criar novos contextos com persistência, revisar se os dados a serem salvos contêm credenciais ou PII antes de escrever no `localStorage`.

---

## 4. Randomness — Usar `crypto.randomUUID()` para IDs

`Math.random()` não é criptograficamente seguro e não deve ser usado para gerar IDs com qualquer relevância de segurança.

```tsx
// CORRETO — já usado em CartContext e CartDrawer
const itemId = crypto.randomUUID();
const batchId = crypto.randomUUID();

// ERRADO
const id = Math.random().toString(36).slice(2);
```

> `crypto.randomUUID()` está disponível em todos os browsers modernos e no Node 18+. Não há razão para usar `Math.random()` para geração de IDs.

---

## 5. Dados do backend — Validar antes de usar

Hoje o app usa `MockMarketplaceClient` com dados estáticos. Quando o backend real for integrado, os dados vindos da API devem ser tratados como **não confiáveis** até validação.

Pontos de atenção na integração futura:

| Campo | Risco sem validação | Validação necessária |
|---|---|---|
| `documentationUrl` | `javascript:` URL executável no `href` | Validar protocolo `https:` (ver seção 2) |
| `offer.longDescription` | XSS se renderizado como HTML | Manter como texto simples ou usar `rehype-sanitize` |
| `parameter.validation.pattern` | ReDoS se padrão malicioso | Validar regex no backend antes de devolver |
| `accentColor` | CSS injection se usado em `style=` | Usar apenas em `sx={}` (MUI — seguro) |

---

## 6. Parâmetros de URL — Não tomar decisões de segurança com base neles

`providerId`, `offerId`, `batchId` vindos de `useParams()` são controlados pelo usuário. Nunca usar esses valores como base para:

- Verificação de permissões
- Autenticação
- Decisões de acesso

Eles são apenas chaves de consulta. O backend é responsável por verificar se o usuário tem acesso ao recurso solicitado.

```tsx
// CORRETO — usa param como chave de busca, não como prova de autorização
const { batchId } = useParams<{ batchId: string }>();
const batch = getBatch(batchId ?? '');  // retorna undefined se não existir
```

---

## 7. Dependências — Manter o `npm audit` limpo

Executar periodicamente:

```bash
npm audit
```

Vulnerabilidades de dependências diretas (`dependencies`) têm prioridade sobre `devDependencies`.

> **Restrição crítica:** Não fazer upgrade do Vite para além da versão atual sem validar compatibilidade com MUI/Emotion. O Rolldown (bundler do Vite 6+) pode criar problemas de chunk ordering com MUI quando code splitting está habilitado. Ver `README.md` para detalhes.

---

## 8. Iframe e CSP — Princípio do menor privilégio

O app é embutido no Backstage via `<iframe>`. Na configuração de produção:

- A entrada `frame-src` no CSP do Backstage deve apontar **apenas para o domínio real** do app — nunca usar `*`
- Não adicionar `postMessage` listeners sem validar `event.origin` explicitamente
- Não armazenar tokens de sessão do Backstage no `localStorage` do iframe (origens diferentes não compartilham storage)

```yaml
# app-config.yaml — produção
backend:
  csp:
    frame-src: ["'self'", 'https://cloud-marketplace.interno.empresa.com']
    # NUNCA: frame-src: ["*"]
```

---

## 9. Sem segredos no código fonte

Nunca commitar no repositório:

- Tokens de API
- Senhas ou passphrases
- Connection strings com credenciais
- Chaves privadas ou certificados

Usar variáveis de ambiente (`.env.local`, nunca commitado) para qualquer valor sensível necessário em build time. O `.gitignore` deve incluir `.env*` (já configurado pelo template Vite).

---

## Checklist para code review

Antes de aprovar um PR, verificar:

- [ ] Nenhum uso de `dangerouslySetInnerHTML`, `eval`, `innerHTML`
- [ ] URLs de API usadas em `href` passam pela validação de protocolo
- [ ] Nenhum dado sensível adicionado ao `localStorage`
- [ ] IDs gerados com `crypto.randomUUID()`, não com `Math.random()`
- [ ] Nenhum segredo ou credencial no código
- [ ] Links externos têm `rel="noopener noreferrer"`
- [ ] `npm audit` sem vulnerabilidades de severidade high/critical
