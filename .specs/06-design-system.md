# Design System — Guia Visual

> Extraído do código real da v0.1. Ao criar novas páginas ou componentes, siga estes padrões para manter harmonia visual com o que já existe.

---

## 1. Paleta de Cores

### Cores primárias (paleta B3)

| Token | Hex | Uso |
|---|---|---|
| Primary | `#003087` | Botões primários, sidebar ativa, bordas de destaque, ícones principais |
| Primary light | `#0050B3` | Gradiente dos botões, segundo tom do hero |
| Primary dark | `#001f5c` | Início do gradiente do hero, hover de botões |
| Surface primary | `rgba(0,48,135,0.07)` | Fundo de ícone-container neutro, hover de itens da sidebar |
| Surface primary hover | `rgba(0,48,135,0.12)` | Hover dos grupos da sidebar |

### Cores de superfície e texto

| Token | Hex | Uso |
|---|---|---|
| Background page | `#F4F6F9` | Fundo da área de conteúdo |
| Background paper | `#FFFFFF` | Cards, drawers, panels |
| Surface subtle | `#F7FAFC` | Fundo de seções internas, header de metadados |
| Surface muted | `#EDF2F7` | Chips neutros, fundo de tags |
| Border default | `#E2E8F0` | Bordas de cards, Papers, dividers, linhas horizontais |
| Text primary | `#0A1628` | Títulos, labels principais |
| Text secondary | `#4A5568` | Descrições, labels de campo |
| Text disabled | `#A0AEC0` / `#CBD5E0` | Ícones decorativos, estados desabilitados, texto inativo |

### Cores de status

| Status | Fundo | Texto | Borda | Ícone |
|---|---|---|---|---|
| Sucesso | `#F0FFF4` / `#C6F6D5` | `#276749` | `#9AE6B4` | `#38A169` |
| Erro | `#FFF5F5` / `#FED7D7` | `#C53030` | `#FEB2B2` | `#E53E3E` |

- Fundo claro (`#F0FFF4`, `#FFF5F5`) → superfície de cards de resultado
- Fundo saturado (`#C6F6D5`, `#FED7D7`) → Chips de status inline

### Cores de providers (accent)

| Provider | Hex | Uso |
|---|---|---|
| AWS | `#FF9900` | Badge, ícone e `accentColor` nos cards |
| Azure | `#0078D4` | Badge, ícone e `accentColor` nos cards |
| OCI | `#C74634` | Badge, ícone e `accentColor` nos cards |

Padrão de uso das accent colors:
- Fundo do ícone-container: `accentColor + "15"` (opacidade ~8%)
- Borda do ícone-container: `accentColor + "30"` (opacidade ~19%)
- Background do chip de provider: `accentColor + "18"` (opacidade ~10%)
- Borda do chip de provider: `accentColor + "40"` (opacidade ~25%)

---

## 2. Tipografia

**Fonte:** IBM Plex Sans (Google Fonts) — pesos 400 / 500 / 600 / 700 / 800

### Hierarquia de uso

| Variante MUI | `fontWeight` | Contexto típico |
|---|---|---|
| `h4` | 800 | Título de hero (HomePage) |
| `h5` | 800 | Título de página (`DeploymentPage`, `DeploymentsListPage`) |
| `h6` | 700 | Título de card (`ProviderCard`), cabeçalho de drawer |
| `body1` | 700 | Nome de oferta dentro de card; texto de destaque |
| `body2` | — (400) | Descrição de oferta, texto de suporte |
| `body2` | 600–700 | Labels de metadados, contagens |
| `caption` | — | Timestamps, IDs, textos de apoio |
| `caption` | 600 | Labels de campos de metadados em CAPS (`color="text.disabled"`) |
| `overline` | 600–700 | Seção de título em caps (`letterSpacing: 2–3`, `fontSize: "0.7rem"`, `color="text.disabled"`) |
| `button` | 600 | Texto de botão (definido no tema, não sobrescrever inline) |

**IDs e valores técnicos:** usar `fontFamily="monospace"` em `Typography`.

---

## 3. Botões

Configurados globalmente em `theme.ts` — não sobrescrever `borderRadius` ou `textTransform` inline.

### Variantes e quando usar

| Variante | Aparência | Quando usar |
|---|---|---|
| `contained` (primary) | Gradiente `#003087 → #0050B3`, texto branco | CTA principal da página/modal (apenas um por tela) |
| `outlined` | Borda `#E2E8F0`, texto `text.secondary` | Ação secundária ao lado do CTA principal |
| `text` | Sem borda, texto `text.secondary` | Ações terciárias, botões "voltar" e navegações leves |

### Tamanhos

| `size` | Contexto |
|---|---|
| `large` | CTAs em drawer (`CartDrawer`), ações de confirmação |
| `medium` (default) | Botões de página (ex: `DeploymentPage`) |
| `small` | Botões dentro de cards (ex: `HomePage` módulos) |

### Padrões de layout

- `fullWidth` — dentro de drawers e painéis laterais
- `alignSelf: 'flex-start'` — dentro de cards para não esticar
- `startIcon` — para botões de navegação/ação com ícone à esquerda (ex: "← Histórico")
- `endIcon` — para botões de avanço/acesso (ex: "Acessar →")
- `disabled` com `startIcon={<CircularProgress size={16} />}` — estado de loading em botões

### Ícones em botões

- `size={16}` no `CircularProgress` dentro de `startIcon`
- Ícones MUI: `fontSize="small"` ou `fontSize={18}` — nunca `fontSize="large"` em botões

---

## 4. Ícone-containers (Avatar Boxes)

Caixas quadradas com ícone centralizado — padrão recorrente no app.

| Tamanho | Contexto | `borderRadius` | Fundo |
|---|---|---|---|
| 32×32 | Logo da sidebar | `borderRadius: 1.5` (12px) | Gradiente `#003087 → #0050B3` |
| 36×36 | Lista de lotes (`DeploymentsListPage`) | `borderRadius: 1.5` | Sucesso/erro surface |
| 40×40 | Tiles de stats (`HomePage`) | `borderRadius: 1.5` | `rgba(0,48,135,0.07)` |
| 52×52 | `ProviderCard` | `borderRadius: 2` (16px) | `accentColor + "15"`, borda `accentColor + "30"` |
| 56×56 | Cards de módulo (`HomePage`) | `borderRadius: 2` | Gradiente (ativo) ou `#F7FAFC` (inativo) |
| 48 (ícone puro) | EmptyState | sem container | ícone com `color: #CBD5E0` |

**Tamanho do ícone interno:** proporcional ao container — regra aproximada: ícone ≈ 50–55% da caixa.

---

## 5. Cards e Papers

### `MuiCard` (via tema)

- `boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)'`
- `border: '1px solid #E2E8F0'`
- Hover: `boxShadow: '0 8px 24px rgba(0,48,135,0.12)'` + `transform: translateY(-2px)`
- Transition: `box-shadow 0.2s, transform 0.2s`
- `CardContent` padding padrão: `p={2.5}` ou `p={3}`

### `Paper variant="outlined"` (uso manual)

- `borderColor: '#E2E8F0'`
- `borderRadius: 2` (16px) ou `borderRadius: 2.5` (20px)
- Hover interativo (clicável): `boxShadow: '0 2px 12px rgba(0,48,135,0.08)'` + `borderColor: '#003087'`; transition `0.15s`
- Estado ativo/selecionado: `borderColor: '#003087'`, `borderWidth: 1.5`
- Status colorido: `borderColor: #9AE6B4` (sucesso) ou `#FEB2B2` (erro); `backgroundColor` correspondente

### Padrão de layout interno de cards

```
Card / Paper
 ├── [Topo] Ícone-container  +  Título (+ Badge opcional)
 ├── [Meio] Descrição / corpo (flex: 1)
 └── [Rodapé] Metadata (caption) + Ação (botão/seta)
```

---

## 6. Chips

| Tipo | `backgroundColor` | `color` | `border` | `fontWeight` |
|---|---|---|---|---|
| Provider badge | `accentColor + "18"` | `accentColor` | `1px solid accentColor + "40"` | 700 |
| Categoria — padrão | transparente | `#4A5568` | `1px solid #CBD5E0` | — |
| Categoria — selecionado | `#003087` | `#fff` | `1px solid #003087` | 600 |
| Status sucesso | `#C6F6D5` | `#276749` | — | 700 |
| Status erro | `#FED7D7` | `#C53030` | — | 700 |
| Status "Em breve" | `#EDF2F7` | `#718096` | — | — |
| Tag neutra (nome de oferta) | `#EDF2F7` | `#4A5568` | — | — |
| Parâmetro inline | `rgba(0,0,0,0.05)` | `#4A5568` | — | — |

Tamanhos: `size="small"` na maioria dos contextos; `size="medium"` apenas em `ProviderBadge` quando explicitamente solicitado.

**Chip de resumo de status** (ex: header de `DeploymentPage`): usa `icon`, `fontWeight: 700`, `fontSize: '0.8rem'`, `height: 32`, fundo/cor/borda do status correspondente.

---

## 7. Ícones

### Regra de importação

```ts
// CORRETO — barrel nomeado (compatível com Vite ESM)
import { CloudIcon, RocketLaunchIcon } from '@mui/icons-material';

// ERRADO — import profundo (quebra o build)
import CloudIcon from '@mui/icons-material/Cloud';
```

### Tamanhos de ícone

| Contexto | `fontSize` |
|---|---|
| Sidebar, TopBar, botões pequenos | `"small"` (20px) |
| Ícone decorativo em card (seta, relógio) | `18` |
| Ícone em ícone-container médio (stats, listas) | `22` |
| Ícone em `ProviderCard` | `28` |
| Ícone em cards de módulo (`HomePage`) | `36` |
| EmptyState | `48` |

### Ícones por domínio (mapeamento atual)

| Domínio / Ação | Ícone |
|---|---|
| Cloud Marketplace | `CloudIcon` |
| Implantações / Lotes | `RocketLaunchIcon` |
| On-Premise | `StorageIcon` |
| Dashboards | `DashboardIcon` |
| Métricas | `BarChartIcon` |
| Logs | `ArticleIcon` |
| Configurações | `SettingsIcon` |
| Usuários / Cadastros | `GroupIcon` |
| Integrações | `HubIcon` |
| Permissões | `LockIcon` |
| Infraestrutura (grupo) | `LayersIcon` |
| Observabilidade (grupo) | `VisibilityIcon` |
| Sucesso | `CheckCircleIcon` |
| Erro / Falha | `ErrorIcon` |
| Navegar adiante | `ArrowForwardIcon`, `ChevronRightIcon` |
| Navegar atrás | `ArrowBackIcon` |
| Fechar | `CloseIcon` |
| Busca | `SearchIcon` |
| Carrinho | `ShoppingCartOutlinedIcon` |
| Catálogo | `Inventory2OutlinedIcon` |
| Loja | `StorefrontOutlinedIcon` |
| Tempo estimado | `AccessTimeIcon` |

---

## 8. Espaçamento e Layout

Baseado na grade MUI (`spacing = 8px`):

| Contexto | Valor |
|---|---|
| Padding de página (horizontal) | `px={{ xs: 3, md: 6 }}` → 24–48px |
| Padding de página (vertical) | `py={{ xs: 3, md: 5 }}` → 24–40px |
| Padding interno de card | `p={2.5}` (20px) ou `p={3}` (24px) |
| Gap entre cards em grid | `spacing={2}` (16px) ou `spacing={2.5}` (20px) |
| Gap entre elementos dentro de card | `gap={1.5}` (12px) ou `gap={2}` (16px) |
| Gap entre seções na página | `mb={4}` (32px) antes do conteúdo |
| Gap entre botões de ação | `gap={2}` (16px) |

**Largura máxima de conteúdo de página** (páginas de detalhe, listas): `maxWidth={760}`.

---

## 9. EmptyState

Padrão usado quando não há dados para exibir:

```
<Box p={6} display="flex" flexDirection="column" alignItems="center" gap={2}>
  <[Ícone relevante] sx={{ fontSize: 48, color: '#CBD5E0' }} />
  <Typography variant="h6" color="text.secondary" fontWeight={600}>
    [Mensagem principal]
  </Typography>
  <Typography variant="body2" color="text.disabled">
    [Mensagem de apoio explicando por que está vazio]
  </Typography>
  <Button variant="contained" onClick={...} sx={{ mt: 1 }}>
    [Ação para sair do estado vazio]
  </Button>
</Box>
```

---

## 10. Hero / Cabeçalho de Página

**Hero com gradiente** (usado na `HomePage`):

```
background: 'linear-gradient(135deg, #001f5c 0%, #003087 55%, #0050B3 100%)'
px: { xs: 3, md: 6 }, py: { xs: 5, md: 6 }
```

Estrutura interna:
1. `overline` — rótulo de contexto (`color: rgba(255,255,255,0.55)`)
2. `h4` fontWeight 800 — título principal (`color: #fff`)
3. `body1` — subtítulo (`color: rgba(255,255,255,0.6)`, `maxWidth: 480`)

Efeitos decorativos: dois `::before`/`::after` com círculos de `rgba(255,255,255,0.03–0.04)`, posicionados fora da área visível.

**Cabeçalho simples de página** (sem gradiente — usado em `DeploymentPage`, `DeploymentsListPage`):

```
<Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
<Typography variant="body2" color="text.secondary">
```

---

## 11. Seções com rótulo em caps

Usado para separar blocos de conteúdo dentro de uma página:

```tsx
<Typography variant="overline" sx={{
  color: 'text.disabled',
  letterSpacing: 2,
  fontSize: '0.7rem',
  fontWeight: 700,
}}>
  Nome da Seção
</Typography>
```

---

## 12. Labels de metadados (campos informativos)

Padrão dos painéis de detalhe (ex: "ID DO LOTE", "DATA E HORA"):

```tsx
<Box>
  <Typography variant="caption" color="text.disabled" fontWeight={600} display="block" mb={0.25}>
    LABEL EM CAPS
  </Typography>
  <Typography variant="body2" color="text.primary" [fontFamily="monospace"]>
    valor
  </Typography>
</Box>
```

---

## 13. Transições e Animações

| Elemento | Propriedade | Duração |
|---|---|---|
| `MuiCard` hover | `box-shadow`, `transform` | `0.2s` |
| `Paper` clicável hover | `box-shadow`, `border-color` | `0.15s` |
| `Collapse` da sidebar | `timeout` | `180ms` |
| Botões e inputs | padrão MUI | — |

**Regra:** não usar `transition` com duração acima de `0.2s` em interações diretas do usuário.
