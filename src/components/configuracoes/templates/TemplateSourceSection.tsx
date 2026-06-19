import {
  Box, Button, Chip, CircularProgress, Divider, FormControlLabel,
  IconButton, Paper, Switch, TextField, Typography,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  FolderOpen as FolderOpenIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useEffect, useRef, useState } from 'react';
import { parseGitHubUrl } from '../../../api/MarketplaceClient';
import type { GitHubClientConfig } from '../../../api/MarketplaceClient';

type VerifyState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

function detectSourceType(source: string): 'github' | 'local' | 'unknown' {
  const s = source.trim();
  if (s.startsWith('https://github.com/') || s.startsWith('http://github.com/')) return 'github';
  if (s.startsWith('/') || s.startsWith('~')) return 'local';
  return 'unknown';
}

function getSourceLabel(source: string): string {
  const type = detectSourceType(source);
  if (type === 'github') {
    const cfg = parseGitHubUrl(source);
    if (cfg) return `${cfg.owner}/${cfg.repo} · ${cfg.branch}`;
  }
  return source;
}

async function verifyLocalPath(localPath: string): Promise<VerifyState> {
  try {
    const scanRes = await fetch(`/local-templates?action=scan&path=${encodeURIComponent(localPath)}`);
    if (!scanRes.ok) {
      const err = await scanRes.json().catch(() => ({ error: `HTTP ${scanRes.status}` })) as { error: string };
      return { status: 'error', message: err.error };
    }
    const paths = await scanRes.json() as string[];
    if (paths.length === 0) return { status: 'error', message: `Nenhum template.yaml encontrado em: ${localPath}` };
    const providerIds = await Promise.all(paths.map(async p => {
      const r = await fetch(`/local-templates?action=read&path=${encodeURIComponent(p)}`);
      if (!r.ok) return null;
      const { content } = await r.json() as { content: string };
      const match = content.match(/^provider:\s*(\S+)/m);
      return match?.[1] ?? null;
    }));
    const found = [...new Set(providerIds.filter(Boolean) as string[])];
    if (found.length === 0) return { status: 'error', message: `Nenhum template com campo provider: encontrado em: ${localPath}` };
    return { status: 'ok', message: `Providers encontrados: ${found.map(p => p.toUpperCase()).join(', ')}` };
  } catch (e) {
    return { status: 'error', message: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function verifyGitHubConfig(cfg: GitHubClientConfig): Promise<VerifyState> {
  try {
    const treeRes = await fetch(
      `/github-api/repos/${cfg.owner}/${cfg.repo}/git/trees/${cfg.branch}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (treeRes.status === 401 || treeRes.status === 403) return { status: 'error', message: 'Sem acesso — verifique se o GITHUB_TOKEN está configurado.' };
    if (treeRes.status === 404) return { status: 'error', message: `Repositório não encontrado: ${cfg.owner}/${cfg.repo}` };
    if (!treeRes.ok) return { status: 'error', message: `GitHub API retornou HTTP ${treeRes.status}` };
    const tree = await treeRes.json() as { tree: { path: string; type: string }[] };
    const templatePaths = tree.tree
      .filter(i => i.type === 'blob' && /^template\.ya?ml$/i.test(i.path.split('/').at(-1)!))
      .map(i => i.path);
    if (templatePaths.length === 0) return { status: 'error', message: 'Nenhum template.yaml encontrado no repositório' };
    const providerIds = await Promise.all(templatePaths.map(async p => {
      const r = await fetch(
        `/github-api/repos/${cfg.owner}/${cfg.repo}/contents/${p}?ref=${cfg.branch}`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!r.ok) return null;
      const file = await r.json() as { content?: string };
      if (!file.content) return null;
      const text = atob(file.content.replace(/\n/g, ''));
      const match = text.match(/^provider:\s*(\S+)/m);
      return match?.[1] ?? null;
    }));
    const found = [...new Set(providerIds.filter(Boolean) as string[])];
    if (found.length === 0) return { status: 'error', message: 'Nenhum template com campo provider: encontrado no repositório' };
    return { status: 'ok', message: `Providers encontrados: ${found.map(p => p.toUpperCase()).join(', ')}` };
  } catch (e) {
    return { status: 'error', message: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function verifySource(source: string): Promise<VerifyState> {
  const type = detectSourceType(source.trim());
  if (type === 'github') {
    const cfg = parseGitHubUrl(source.trim());
    if (!cfg) return { status: 'error', message: 'URL GitHub inválida — use https://github.com/org/repo' };
    return verifyGitHubConfig(cfg);
  }
  if (type === 'local') return verifyLocalPath(source.trim());
  return { status: 'error', message: 'Formato inválido — use URL GitHub (https://github.com/...) ou caminho absoluto (/home/... ou ~/...)' };
}

export interface TemplateSourceSectionProps {
  sources: string[];
  autoReload: boolean;
  setSources: (s: string[]) => void;
  setAutoReload: (v: boolean) => void;
  accentColor?: string;
}

export function TemplateSourceSection({
  sources, autoReload, setSources, setAutoReload, accentColor = '#003087',
}: TemplateSourceSectionProps) {
  const [inputValue, setInputValue] = useState('');
  const [verifyStates, setVerifyStates] = useState<Record<string, VerifyState>>({});
  const verifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    sources.forEach(source => {
      if (verifiedRef.current.has(source)) return;
      verifiedRef.current.add(source);
      setVerifyStates(prev => ({ ...prev, [source]: { status: 'checking' } }));
      verifySource(source).then(state => {
        setVerifyStates(prev => ({ ...prev, [source]: state }));
      });
    });
  }, [sources]);

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || sources.includes(trimmed)) { setInputValue(''); return; }
    setSources([...sources, trimmed]);
    setInputValue('');
  };

  const handleRemove = (source: string) => {
    setSources(sources.filter(s => s !== source));
    verifiedRef.current.delete(source);
    setVerifyStates(prev => { const n = { ...prev }; delete n[source]; return n; });
  };

  const hasLocal = sources.some(s => detectSourceType(s) === 'local');

  // Status agregado para a barra "Fonte ativa"
  const anyChecking = sources.some(s => !verifyStates[s] || verifyStates[s].status === 'checking');
  const allOk = sources.length > 0 && sources.every(s => verifyStates[s]?.status === 'ok');
  const anyError = sources.some(s => verifyStates[s]?.status === 'error');

  const aggregateProviders = [...new Set(
    sources
      .filter(s => verifyStates[s]?.status === 'ok')
      .flatMap(s => {
        const msg = (verifyStates[s] as { status: 'ok'; message: string }).message;
        const m = msg.match(/Providers encontrados: (.+)/);
        return m ? m[1].split(', ') : [];
      })
  )];

  const activeStyle = allOk
    ? { border: '#38A169', bg: 'rgba(56,161,105,0.08)', text: '#276749' }
    : anyError
    ? { border: '#E53E3E', bg: 'rgba(229,62,62,0.07)', text: '#C53030' }
    : { border: '#CBD5E0', bg: '#F7FAFC', text: '#718096' };

  const activeLabel = sources.length === 0
    ? 'Nenhuma fonte configurada'
    : sources.length === 1
    ? getSourceLabel(sources[0])
    : `${sources.length} fontes configuradas${aggregateProviders.length ? ` · ${aggregateProviders.join(', ')}` : ''}`;

  return (
    <>
      {/* Input para adicionar nova fonte */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 2, borderRadius: 2, borderColor: `${accentColor}30` }}>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={0.5}>
          Adicionar fonte
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          URL de repositório GitHub ou caminho de pasta local com os templates.
        </Typography>
        <Box display="flex" gap={1} alignItems="flex-start">
          <TextField
            size="small"
            fullWidth
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="https://github.com/org/repo  ou  /home/user/templates"
            helperText="URL GitHub ou caminho absoluto (iniciando com / ou ~)"
          />
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={!inputValue.trim()}
            startIcon={<AddIcon />}
            sx={{ minWidth: 120, flexShrink: 0, backgroundColor: accentColor, '&:hover': { backgroundColor: `${accentColor}cc` } }}
          >
            Adicionar
          </Button>
        </Box>
      </Paper>

      {/* Lista de fontes configuradas */}
      {sources.length > 0 && (
        <Paper variant="outlined" sx={{ mb: 2, borderRadius: 2, overflow: 'hidden' }}>
          <Box px={2} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'action.hover' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ letterSpacing: '0.05em' }}>
              FONTES CONFIGURADAS ({sources.length})
            </Typography>
          </Box>

          {sources.map((source, i) => {
            const type = detectSourceType(source);
            const verify = verifyStates[source] ?? { status: 'idle' };

            return (
              <Box key={source} sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                borderBottom: i < sources.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}>
                <Box sx={{ color: 'text.secondary', display: 'flex', flexShrink: 0 }}>
                  {type === 'github'
                    ? <GitHubIcon sx={{ fontSize: 18 }} />
                    : <FolderOpenIcon sx={{ fontSize: 18 }} />}
                </Box>

                <Box flex={1} minWidth={0}>
                  <Typography variant="body2" fontWeight={500} sx={{ wordBreak: 'break-all' }}>
                    {getSourceLabel(source)}
                  </Typography>
                  {verify.status === 'ok' && (
                    <Typography variant="caption" color="success.main">{verify.message}</Typography>
                  )}
                  {verify.status === 'error' && (
                    <Typography variant="caption" color="error.main">{verify.message}</Typography>
                  )}
                </Box>

                <Chip
                  label={type === 'github' ? 'GitHub' : type === 'local' ? 'Local' : '?'}
                  size="small"
                  sx={{ height: 18, fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}
                  color={type === 'github' ? 'primary' : type === 'local' ? 'warning' : 'default'}
                />

                <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', width: 20, justifyContent: 'center' }}>
                  {verify.status === 'checking' && <CircularProgress size={14} />}
                  {verify.status === 'ok' && <CheckCircleIcon sx={{ fontSize: 16, color: 'success.main' }} />}
                  {verify.status === 'error' && <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />}
                </Box>

                <IconButton size="small" onClick={() => handleRemove(source)} sx={{ flexShrink: 0, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            );
          })}
        </Paper>
      )}

      {/* Auto Reload — exibido apenas quando há fontes locais */}
      {hasLocal && (
        <>
          <Divider sx={{ my: 2 }} />
          <FormControlLabel
            control={<Switch size="small" checked={autoReload} onChange={e => setAutoReload(e.target.checked)} />}
            label={
              <Box>
                <Typography variant="body2" fontWeight={500}>Auto Reload</Typography>
                <Typography variant="caption" color="text.secondary">
                  Atualiza as ofertas automaticamente ao editar os templates locais
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', mb: 2 }}
          />
        </>
      )}

      {/* Barra de status agregado */}
      <Typography variant="subtitle2" fontWeight={700} color="text.primary" mt={1} mb={1}>
        Fonte ativa
      </Typography>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderRadius: 2,
        border: `1.5px solid ${activeStyle.border}`,
        backgroundColor: activeStyle.bg,
        transition: 'border-color 0.3s, background-color 0.3s',
      }}>
        {anyChecking
          ? <CircularProgress size={16} sx={{ flexShrink: 0 }} />
          : allOk
          ? <CheckCircleIcon sx={{ fontSize: 18, color: activeStyle.text, flexShrink: 0 }} />
          : anyError
          ? <ErrorIcon sx={{ fontSize: 18, color: activeStyle.text, flexShrink: 0 }} />
          : sources.length === 0
          ? <FolderOpenIcon sx={{ fontSize: 18, color: activeStyle.text, flexShrink: 0 }} />
          : <CircularProgress size={16} sx={{ flexShrink: 0 }} />}
        <Typography variant="body2" fontWeight={700} color={activeStyle.text} sx={{ wordBreak: 'break-all' }}>
          {activeLabel}
        </Typography>
      </Box>
    </>
  );
}
