import { useEffect, useState } from 'react';
import {
  Alert, Box, Button, Chip, CircularProgress, Divider,
  InputAdornment, Paper, TextField, Tooltip, Typography,
} from '@mui/material';
import {
  GitHub as GitHubIcon,
  CheckCircle as CheckCircleIcon,
  ErrorOutline as ErrorIcon,
  PowerSettingsNew as DisconnectedIcon,
  Refresh as RefreshIcon,
  Key as KeyIcon,
  Code as EnvIcon,
  PlayArrow as ActivateIcon,
  Business as OrgIcon,
} from '@mui/icons-material';

interface TokenStatus {
  configured: boolean;
  preview: string | null;
  source: 'env';
  enabled: boolean;
}

interface ConnectionResult {
  status: 'idle' | 'checking' | 'ok' | 'error';
  message?: string;
  login?: string;
  scopes?: string;
}

async function fetchTokenStatus(): Promise<TokenStatus> {
  const res = await fetch('/github-token-status');
  if (!res.ok) throw new Error('middleware indisponível');
  return res.json() as Promise<TokenStatus>;
}

async function toggleGitHub(enabled: boolean): Promise<void> {
  await fetch('/github-toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enabled }),
  });
}

async function testConnection(): Promise<ConnectionResult> {
  try {
    const res = await fetch('/github-api/user', {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 401) return { status: 'error', message: 'Token inválido ou sem permissão.' };
    if (!res.ok) return { status: 'error', message: `GitHub retornou HTTP ${res.status}` };
    const data = await res.json() as { login: string };
    const scopes = res.headers.get('x-oauth-scopes') ?? '';
    return { status: 'ok', login: data.login, scopes };
  } catch (e) {
    return { status: 'error', message: e instanceof Error ? e.message : 'Erro desconhecido' };
  }
}

const STORAGE_KEY = 'integracoes:github:activated';
const ORG_KEY = 'integracoes:github:org';

export function GitHubIntegrationCard() {
  const [tokenStatus, setTokenStatus] = useState<TokenStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [conn, setConn] = useState<ConnectionResult>({ status: 'idle' });
  const [org, setOrg] = useState(() => localStorage.getItem(ORG_KEY) ?? '');

  const load = async () => {
    setLoadingStatus(true);
    try {
      setTokenStatus(await fetchTokenStatus());
    } catch {
      setTokenStatus({ configured: false, preview: null, source: 'env', enabled: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    // Sincroniza o estado do servidor com a última preferência salva localmente
    const wasActivated = localStorage.getItem(STORAGE_KEY) === 'true';
    if (wasActivated) {
      toggleGitHub(true).then(() => load());
    } else {
      // Garante que o servidor reflita a preferência de "inativo"
      toggleGitHub(false);
    }
  }, []);

  const handleActivate = async () => {
    if (activated) {
      localStorage.removeItem(STORAGE_KEY);
      await toggleGitHub(false);
      setTokenStatus(null);
      setConn({ status: 'idle' });
    } else {
      localStorage.setItem(STORAGE_KEY, 'true');
      await toggleGitHub(true);
      await load();
    }
  };

  const handleOrgChange = (value: string) => {
    setOrg(value);
    if (value.trim()) localStorage.setItem(ORG_KEY, value.trim());
    else localStorage.removeItem(ORG_KEY);
  };

  const handleTest = async () => {
    setConn({ status: 'checking' });
    setConn(await testConnection());
  };

  const activated = tokenStatus?.enabled ?? false;
  const isConnected = conn.status === 'ok';
  const hasError = conn.status === 'error';

  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        borderColor: isConnected ? '#38A169' : hasError ? '#E53E3E' : '#E2E8F0',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3, py: 2.5,
          bgcolor: isConnected ? 'rgba(56,161,105,0.05)' : '#FAFAFA',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 2, flexShrink: 0,
              bgcolor: '#24292F',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <GitHubIcon sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary" lineHeight={1.2}>
              GitHub
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Personal Access Token
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          {loadingStatus ? (
            <CircularProgress size={16} />
          ) : !activated ? (
            <Chip
              label="Inativo"
              size="small"
              sx={{ bgcolor: '#F7FAFC', color: '#718096', fontWeight: 700, borderColor: '#CBD5E0', border: '1px solid' }}
            />
          ) : isConnected ? (
            <Chip
              icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
              label="Conectado"
              size="small"
              sx={{ bgcolor: '#F0FFF4', color: '#276749', fontWeight: 700, borderColor: '#38A169', border: '1px solid' }}
            />
          ) : tokenStatus?.configured ? (
            <Chip
              icon={<KeyIcon sx={{ fontSize: '14px !important' }} />}
              label="Token configurado"
              size="small"
              sx={{ bgcolor: '#EBF4FF', color: '#003087', fontWeight: 700, borderColor: '#003087', border: '1px solid' }}
            />
          ) : (
            <Chip
              icon={<DisconnectedIcon sx={{ fontSize: '14px !important' }} />}
              label="Não configurado"
              size="small"
              sx={{ bgcolor: '#FFF5F5', color: '#C53030', fontWeight: 700, borderColor: '#FC8181', border: '1px solid' }}
            />
          )}
        </Box>
      </Box>

      {/* Body */}
      <Box px={3} py={2.5} display="flex" flexDirection="column" gap={2}>

        {/* Token source — exibe após carregar o status do servidor */}
        {tokenStatus !== null && (
          loadingStatus ? (
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Lendo variáveis de ambiente...</Typography>
            </Box>
          ) : tokenStatus?.configured ? (
            <Box
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1.5,
                bgcolor: '#F0F7FF', borderRadius: 2, border: '1px solid #BFDBFE',
              }}
            >
              <EnvIcon sx={{ fontSize: 18, color: '#0050B3', flexShrink: 0 }} />
              <Box flex={1} minWidth={0}>
                <Typography variant="caption" fontWeight={700} color="#0050B3" display="block">
                  Variável de ambiente detectada
                </Typography>
                <Box display="flex" alignItems="center" gap={0.75} mt={0.25}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    component="code"
                    sx={{ fontFamily: 'monospace', bgcolor: '#E8F0FE', px: 0.75, py: 0.25, borderRadius: 1 }}
                  >
                    GITHUB_TOKEN
                  </Typography>
                  {tokenStatus.preview && (
                    <Tooltip title="Token mascarado para segurança" arrow>
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        component="code"
                        sx={{ fontFamily: 'monospace', cursor: 'help' }}
                      >
                        · {tokenStatus.preview}
                      </Typography>
                    </Tooltip>
                  )}
                </Box>
              </Box>
              <Tooltip title="Recarregar status">
                <Button size="small" sx={{ minWidth: 0, p: 0.5, color: '#0050B3' }} onClick={load}>
                  <RefreshIcon sx={{ fontSize: 16 }} />
                </Button>
              </Tooltip>
            </Box>
          ) : (
            <Box
              sx={{
                px: 2, py: 1.75, bgcolor: '#FFFBEB', borderRadius: 2,
                border: '1px solid #FDE68A',
              }}
            >
              <Typography variant="caption" fontWeight={700} color="#92400E" display="block" mb={0.5}>
                Variável de ambiente não encontrada
              </Typography>
              <Typography variant="caption" color="#78350F" display="block" lineHeight={1.6}>
                Exporte <code style={{ fontFamily: 'monospace', background: '#FEF3C7', padding: '1px 4px', borderRadius: 3 }}>GITHUB_TOKEN</code> no
                seu shell e reinicie o servidor de desenvolvimento.
              </Typography>
              <Box
                component="pre"
                sx={{
                  mt: 1, mb: 0, p: 1.25, bgcolor: '#1E293B', color: '#E2E8F0',
                  borderRadius: 1.5, fontSize: '0.75rem', fontFamily: 'monospace',
                  overflowX: 'auto', lineHeight: 1.6,
                }}
              >
                {'export GITHUB_TOKEN=ghp_seu_token_aqui\nnpm run dev'}
              </Box>
            </Box>
          )
        )}

        {/* Connection test result */}
        {conn.status === 'checking' && (
          <Box display="flex" alignItems="center" gap={1}>
            <CircularProgress size={14} />
            <Typography variant="caption" color="text.secondary">Testando conexão com a API do GitHub...</Typography>
          </Box>
        )}
        {conn.status === 'ok' && (
          <Alert
            severity="success"
            icon={<CheckCircleIcon fontSize="small" />}
            sx={{ py: 0.5, borderRadius: 1.5 }}
          >
            <Typography variant="caption">
              Autenticado como <strong>@{conn.login}</strong>
              {conn.scopes && (
                <> · escopos: <code style={{ fontFamily: 'monospace' }}>{conn.scopes}</code></>
              )}
            </Typography>
          </Alert>
        )}
        {conn.status === 'error' && (
          <Alert
            severity="error"
            icon={<ErrorIcon fontSize="small" />}
            sx={{ py: 0.5, borderRadius: 1.5 }}
          >
            <Typography variant="caption">{conn.message}</Typography>
          </Alert>
        )}

        {/* Target org */}
        <Box>
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
            Organização de destino
          </Typography>
          <TextField
            size="small"
            fullWidth
            placeholder="ex: minha-organizacao"
            value={org}
            onChange={e => handleOrgChange(e.target.value)}
            helperText={
              org.trim()
                ? `Repositórios serão criados em github.com/${org.trim()}`
                : 'Deixe vazio para criar repositórios na conta pessoal do token'
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <OrgIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#E2E8F0' },
                '&:hover fieldset': { borderColor: '#003087' },
                '&.Mui-focused fieldset': { borderColor: '#003087' },
              },
              '& .MuiInputLabel-root.Mui-focused': { color: '#003087' },
            }}
          />
        </Box>

        <Divider />

        {/* Actions */}
        <Box display="flex" gap={1.5} alignItems="center">
          <Button
            variant={activated ? 'outlined' : 'contained'}
            size="small"
            startIcon={loadingStatus ? <CircularProgress size={14} color="inherit" /> : <ActivateIcon />}
            disabled={loadingStatus}
            onClick={handleActivate}
            sx={activated
              ? { borderColor: '#E53E3E', color: '#E53E3E', '&:hover': { bgcolor: 'rgba(229,62,62,0.05)', borderColor: '#C53030' } }
              : { bgcolor: '#003087', color: '#fff', '&:hover': { bgcolor: '#0050B3' } }
            }
          >
            {activated ? 'Desativar' : 'Ativar'}
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={conn.status === 'checking' ? <CircularProgress size={14} color="inherit" /> : <CheckCircleIcon />}
            disabled={!tokenStatus?.configured || conn.status === 'checking'}
            onClick={handleTest}
            sx={{ borderColor: '#003087', color: '#003087', '&:hover': { bgcolor: 'rgba(0,48,135,0.05)', borderColor: '#003087' } }}
          >
            Testar conexão
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
