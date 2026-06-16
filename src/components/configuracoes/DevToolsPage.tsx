// [DEVTOOLS] Página temporária de ferramentas de desenvolvimento — remover antes de produção
import { Box, Button, CircularProgress, Divider, FormControlLabel, InputAdornment, Switch, TextField, Typography } from '@mui/material';
import { CheckCircle as CheckCircleIcon, Error as ErrorIcon } from '@mui/icons-material';
import { useState } from 'react';

const KEY_ENABLED = 'devtools:reuse_repo_enabled';
const KEY_REPO    = 'devtools:reuse_repo_name';

type CheckStatus = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

async function checkRepoExists(name: string): Promise<'found' | 'not_found' | 'error'> {
  try {
    const userRes = await fetch('/github-api/user', { headers: { Accept: 'application/vnd.github+json' } });
    if (!userRes.ok) return 'error';
    const user = await userRes.json() as { login: string };
    const org = (localStorage.getItem('integracoes:github:org') ?? '').trim();
    const owner = org || user.login;
    const res = await fetch(`/github-api/repos/${owner}/${name}`, { headers: { Accept: 'application/vnd.github+json' } });
    return res.ok ? 'found' : res.status === 404 ? 'not_found' : 'error';
  } catch {
    return 'error';
  }
}

export function DevToolsPage() {
  const [enabled, setEnabled]     = useState(() => localStorage.getItem(KEY_ENABLED) === 'true');
  const [repoName, setRepoName]   = useState(() => localStorage.getItem(KEY_REPO) ?? '');
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle');

  const handleToggle = (value: boolean) => {
    setEnabled(value);
    setCheckStatus('idle');
    localStorage.setItem(KEY_ENABLED, String(value));
  };

  const handleRepoName = (value: string) => {
    setRepoName(value);
    setCheckStatus('idle');
    localStorage.setItem(KEY_REPO, value);
  };

  const handleCheck = async () => {
    if (!repoName.trim()) return;
    setCheckStatus('loading');
    setCheckStatus(await checkRepoExists(repoName.trim()));
  };

  const statusAdornment = checkStatus === 'loading'
    ? <InputAdornment position="end"><CircularProgress size={16} /></InputAdornment>
    : checkStatus === 'found'
    ? <InputAdornment position="end"><CheckCircleIcon fontSize="small" color="success" /></InputAdornment>
    : checkStatus === 'not_found' || checkStatus === 'error'
    ? <InputAdornment position="end"><ErrorIcon fontSize="small" color="error" /></InputAdornment>
    : undefined;

  const helperText = checkStatus === 'found'     ? 'Repositório encontrado.'
    : checkStatus === 'not_found' ? 'Repositório não encontrado.'
    : checkStatus === 'error'     ? 'Erro ao verificar — confira o token e a org em Integrações.'
    : 'Se ativo, o provisionamento ignora a criação de repo e commita neste.';

  const helperColor = checkStatus === 'found' ? 'success.main'
    : checkStatus === 'not_found' || checkStatus === 'error' ? 'error.main'
    : 'text.secondary';

  return (
    <Box sx={{ p: 4, maxWidth: 600 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>DevTools</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Configurações temporárias para facilitar testes. Não usar em produção.
      </Typography>

      <Divider sx={{ mb: 3 }} />

      <Typography variant="subtitle1" fontWeight={600} mb={2}>Provisionamento</Typography>

      <FormControlLabel
        control={<Switch checked={enabled} onChange={e => handleToggle(e.target.checked)} />}
        label="Reutilizar repositório existente"
        sx={{ mb: 2, display: 'flex' }}
      />

      <Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            label="Nome do repositório de reuso"
            value={repoName}
            onChange={e => handleRepoName(e.target.value)}
            disabled={!enabled}
            fullWidth
            size="small"
            placeholder="meu-repo-de-teste"
            InputProps={{ endAdornment: statusAdornment }}
          />
          <Button
            variant="outlined"
            size="small"
            disabled={!enabled || !repoName.trim() || checkStatus === 'loading'}
            onClick={handleCheck}
            sx={{ whiteSpace: 'nowrap', flexShrink: 0, height: 40 }}
          >
            Verificar
          </Button>
        </Box>
        <Typography variant="caption" color={helperColor} sx={{ mt: 0.5, display: 'block', ml: '14px' }}>
          {helperText}
        </Typography>
      </Box>
    </Box>
  );
}
