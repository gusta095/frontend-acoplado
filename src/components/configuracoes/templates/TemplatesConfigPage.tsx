import {
  Alert, Box, Button, Chip, CircularProgress, Divider, FormControlLabel,
  Paper, Switch, TextField, Typography,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  FolderOpen as FolderOpenIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  RadioButtonChecked as RadioCheckedIcon,
  RadioButtonUnchecked as RadioUncheckedIcon,
} from '@mui/icons-material';
import { useEffect, useState } from 'react';
import { useTemplateSource } from '../../../context/TemplateSourceContext';
import type { GitHubClientConfig } from '../../../api/GitHubMarketplaceClient';

type VerifyState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'ok'; message: string }
  | { status: 'error'; message: string };

async function verifyLocalPath(localPath: string): Promise<VerifyState> {
  try {
    const res = await fetch(`/local-templates?action=list&path=${encodeURIComponent(localPath)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` })) as { error: string };
      return { status: 'error', message: err.error };
    }
    const entries = await res.json() as { name: string; type: string }[];
    const providers = entries.filter(e => e.type === 'dir' && ['aws', 'azure', 'oci'].includes(e.name));
    if (providers.length === 0) {
      const hasTemplatesDir = entries.some(e => e.name === 'templates' && e.type === 'dir');
      return {
        status: 'error',
        message: hasTemplatesDir
          ? 'O path aponta para a raiz do repo — adicione /templates ao final.'
          : `Nenhum provider (aws, azure, oci) encontrado em: ${localPath}`,
      };
    }
    return { status: 'ok', message: `Providers encontrados: ${providers.map(p => p.name.toUpperCase()).join(', ')}` };
  } catch (e) {
    return { status: 'error', message: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function verifyGitHubConfig(cfg: GitHubClientConfig): Promise<VerifyState> {
  try {
    const res = await fetch(
      `/github-api/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.templatesPath}?ref=${cfg.branch}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (res.status === 404) return { status: 'error', message: `Repositório ou caminho não encontrado: ${cfg.owner}/${cfg.repo}/${cfg.templatesPath}` };
    if (res.status === 401 || res.status === 403) return { status: 'error', message: 'Sem acesso — verifique se o GITHUB_TOKEN está configurado.' };
    if (!res.ok) return { status: 'error', message: `GitHub API retornou HTTP ${res.status}` };

    const entries = await res.json() as { name: string; type: string }[];
    const providers = entries.filter(e => e.type === 'dir' && ['aws', 'azure', 'oci'].includes(e.name));
    if (providers.length === 0) return { status: 'error', message: `Nenhum provider (aws, azure, oci) encontrado em ${cfg.templatesPath}` };
    return { status: 'ok', message: `Providers encontrados: ${providers.map(p => p.name.toUpperCase()).join(', ')}` };
  } catch (e) {
    return { status: 'error', message: `Erro de conexão: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function VerifyFeedback({ state }: { state: VerifyState }) {
  if (state.status === 'checking') {
    return (
      <Box display="flex" alignItems="center" gap={0.75}>
        <CircularProgress size={14} />
        <Typography variant="caption" color="text.secondary">Verificando...</Typography>
      </Box>
    );
  }
  if (state.status === 'ok') {
    return (
      <Alert severity="success" icon={<CheckCircleIcon fontSize="small" />} sx={{ py: 0.25 }}>
        <Typography variant="caption">{state.message}</Typography>
      </Alert>
    );
  }
  if (state.status === 'error') {
    return (
      <Alert severity="error" icon={<ErrorIcon fontSize="small" />} sx={{ py: 0.25 }}>
        <Typography variant="caption">{state.message}</Typography>
      </Alert>
    );
  }
  return null;
}

interface SourceCardProps {
  editing: boolean;
  active: boolean;
  accentColor: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  badge?: React.ReactNode;
  onClick: () => void;
}

function SourceCard({ editing, active, accentColor, icon, label, description, badge, onClick }: SourceCardProps) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      sx={{
        flex: 1,
        p: 2,
        borderRadius: 2,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        borderWidth: editing ? 2 : 1,
        borderColor: editing ? accentColor : 'divider',
        backgroundColor: editing ? `${accentColor}08` : 'background.paper',
        '&:hover': { borderColor: accentColor, backgroundColor: `${accentColor}05` },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {editing && (
        <Box sx={{
          position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
          backgroundColor: accentColor, borderRadius: '8px 0 0 8px',
        }} />
      )}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box display="flex" alignItems="center" gap={1}>
          <Box sx={{ color: editing ? accentColor : 'text.secondary', display: 'flex' }}>{icon}</Box>
          <Typography variant="body2" fontWeight={editing ? 700 : 500} color={editing ? accentColor : 'text.primary'}>
            {label}
          </Typography>
          {badge}
        </Box>
        <Box sx={{ color: editing ? accentColor : 'text.disabled', display: 'flex', mt: 0.25 }}>
          {editing ? <RadioCheckedIcon sx={{ fontSize: 18 }} /> : <RadioUncheckedIcon sx={{ fontSize: 18 }} />}
        </Box>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.4}>
        {description}
      </Typography>
      {active && (
        <Box mt={1.25}>
          <Chip
            label="Em uso"
            size="small"
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: accentColor, color: '#fff' }}
          />
        </Box>
      )}
    </Paper>
  );
}

const ACCENT = '#003087';

export function TemplatesConfigPage() {
  const {
    source, githubConfig, localPath, autoReload,
    setSource, setGitHubConfig, setLocalPath, setAutoReload,
  } = useTemplateSource();

  // Which config panel is open — decoupled from the committed `source`
  const [editing, setEditing] = useState<'github' | 'local'>(source);

  const [ghForm, setGhForm] = useState<GitHubClientConfig>(githubConfig);
  const [ghVerify, setGhVerify] = useState<VerifyState>({ status: 'idle' });

  const [localForm, setLocalForm] = useState(localPath);
  const [localVerify, setLocalVerify] = useState<VerifyState>({ status: 'idle' });

  // Auto-verify the currently active source on mount
  useEffect(() => {
    if (source === 'github') {
      setGhVerify({ status: 'checking' });
      verifyGitHubConfig(githubConfig).then(setGhVerify);
    } else if (localPath.trim()) {
      setLocalVerify({ status: 'checking' });
      verifyLocalPath(localPath.trim()).then(setLocalVerify);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Applying GitHub: save config + switch active source + verify
  const handleGhSave = async () => {
    setGitHubConfig(ghForm);
    setSource('github');
    setEditing('github');
    setGhVerify({ status: 'checking' });
    setGhVerify(await verifyGitHubConfig(ghForm));
  };

  // Applying Local: save path + switch active source + verify
  const handleLocalSave = async () => {
    const trimmed = localForm.trim();
    setLocalPath(trimmed);
    setSource('local');
    setEditing('local');
    if (!trimmed) { setLocalVerify({ status: 'idle' }); return; }
    setLocalVerify({ status: 'checking' });
    setLocalVerify(await verifyLocalPath(trimmed));
  };

  const isChecking = ghVerify.status === 'checking' || localVerify.status === 'checking';

  // Status bar always reflects the committed active source, never the editing panel
  const activeVerify = source === 'github' ? ghVerify : localVerify;
  const activeLabel = source === 'github'
    ? `github.com/${githubConfig.owner}/${githubConfig.repo} · ${githubConfig.branch} · /${githubConfig.templatesPath}`
    : localPath.trim() || 'Pasta local não configurada';

  const statusStyle = activeVerify.status === 'ok'
    ? { border: '#38A169', bg: 'rgba(56,161,105,0.08)', text: '#276749' }
    : activeVerify.status === 'error'
    ? { border: '#E53E3E', bg: 'rgba(229,62,62,0.07)', text: '#C53030' }
    : { border: '#CBD5E0', bg: '#F7FAFC', text: '#718096' };

  return (
    <>
      <Box p={4} maxWidth={640}>
        <Box mb={4}>
          <Typography variant="h5" fontWeight={800} color="text.primary" gutterBottom>
            Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure de onde o portal lê os templates de infraestrutura.
            Use GitHub para produção e Pasta Local durante o desenvolvimento.
          </Typography>
        </Box>

        {/* Source selector cards */}
        <Box display="flex" gap={1.5} mb={2.5}>
          <SourceCard
            editing={editing === 'github'}
            active={source === 'github'}
            accentColor={ACCENT}
            icon={<GitHubIcon sx={{ fontSize: 20 }} />}
            label="GitHub"
            description="Lê templates diretamente de um repositório. Recomendado para produção."
            onClick={() => setEditing('github')}
          />
          <SourceCard
            editing={editing === 'local'}
            active={source === 'local'}
            accentColor={ACCENT}
            icon={<FolderOpenIcon sx={{ fontSize: 20 }} />}
            label="Pasta Local"
            description="Lê templates de um diretório local. Ideal para desenvolvimento."
            badge={<Chip label="Dev" size="small" color="warning" sx={{ fontSize: '0.6rem', height: 16 }} />}
            onClick={() => setEditing('local')}
          />
        </Box>

        {/* GitHub config panel */}
        {editing === 'github' && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2.5, borderColor: `${ACCENT}30` }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={0.5}>
              Configurações GitHub
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
              Repositório onde os templates de infraestrutura estão armazenados.
            </Typography>

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" gap={2}>
                <TextField label="Organização / Usuário" size="small" fullWidth value={ghForm.owner}
                  onChange={e => setGhForm(f => ({ ...f, owner: e.target.value }))} />
                <TextField label="Repositório" size="small" fullWidth value={ghForm.repo}
                  onChange={e => setGhForm(f => ({ ...f, repo: e.target.value }))} />
              </Box>
              <Box display="flex" gap={2}>
                <TextField label="Branch" size="small" fullWidth value={ghForm.branch}
                  onChange={e => setGhForm(f => ({ ...f, branch: e.target.value }))} />
                <TextField label="Caminho dos Templates" size="small" fullWidth value={ghForm.templatesPath}
                  onChange={e => setGhForm(f => ({ ...f, templatesPath: e.target.value }))} />
              </Box>
            </Box>

            <Divider sx={{ my: 2.5 }} />

            <Box display="flex" flexDirection="column" gap={1}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Button variant="contained" size="small" onClick={handleGhSave} disabled={isChecking}>
                  Aplicar
                </Button>
                {ghVerify.status === 'checking' && source === 'github' && <VerifyFeedback state={ghVerify} />}
              </Box>
              {(ghVerify.status === 'ok' || ghVerify.status === 'error') && source === 'github' && (
                <VerifyFeedback state={ghVerify} />
              )}
            </Box>
          </Paper>
        )}

        {/* Local config panel */}
        {editing === 'local' && (
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2.5, borderColor: `${ACCENT}30` }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={0.5}>
              Configurações Local
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2.5}>
              Aponte para a pasta <code>templates/</code> dentro do repositório clonado.
            </Typography>

            <TextField
              label="Caminho da pasta templates"
              size="small"
              fullWidth
              value={localForm}
              onChange={e => setLocalForm(e.target.value)}
              placeholder="/caminho/para/platform-templates-offers/templates"
              helperText="Aceita caminho absoluto ou iniciando com ~"
              onKeyDown={e => { if (e.key === 'Enter') handleLocalSave(); }}
            />

            <Divider sx={{ my: 2.5 }} />

            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" flexDirection="column" gap={1}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Button variant="contained" size="small" onClick={handleLocalSave} disabled={isChecking}>
                    Aplicar
                  </Button>
                  {localVerify.status === 'checking' && source === 'local' && <VerifyFeedback state={localVerify} />}
                </Box>
                {(localVerify.status === 'ok' || localVerify.status === 'error') && source === 'local' && (
                  <VerifyFeedback state={localVerify} />
                )}
              </Box>

              <FormControlLabel
                control={<Switch size="small" checked={autoReload} onChange={e => setAutoReload(e.target.checked)} />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={500}>Auto Reload</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Atualiza as ofertas automaticamente ao editar os templates
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start' }}
              />
            </Box>
          </Paper>
        )}

        {/* Active source status */}
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" mt={1} mb={1}>
          Fonte ativa
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 1.25,
            borderRadius: 2,
            border: `1.5px solid ${statusStyle.border}`,
            backgroundColor: statusStyle.bg,
            transition: 'border-color 0.3s, background-color 0.3s',
          }}
        >
          {activeVerify.status === 'checking' ? (
            <CircularProgress size={16} sx={{ flexShrink: 0 }} />
          ) : activeVerify.status === 'ok' ? (
            <CheckCircleIcon sx={{ fontSize: 18, color: statusStyle.text, flexShrink: 0 }} />
          ) : activeVerify.status === 'error' ? (
            <ErrorIcon sx={{ fontSize: 18, color: statusStyle.text, flexShrink: 0 }} />
          ) : source === 'github' ? (
            <GitHubIcon sx={{ fontSize: 18, color: statusStyle.text, flexShrink: 0 }} />
          ) : (
            <FolderOpenIcon sx={{ fontSize: 18, color: statusStyle.text, flexShrink: 0 }} />
          )}
          <Typography variant="body2" fontWeight={700} color={statusStyle.text} sx={{ wordBreak: 'break-all' }}>
            {activeLabel}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
