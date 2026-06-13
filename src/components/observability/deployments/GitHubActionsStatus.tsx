import { useEffect, useState } from 'react';
import { Box, Chip, CircularProgress, Link, Skeleton, Typography } from '@mui/material';
import {
  GitHub as GitHubIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

interface WorkflowRun {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'cancelled' | 'timed_out' | 'action_required' | 'skipped' | null;
  html_url: string;
  run_number: number;
  created_at: string;
}

function RunStatusChip({ run }: { run: WorkflowRun }) {
  if (run.status === 'queued') {
    return (
      <Chip
        size="small"
        icon={<ScheduleIcon sx={{ fontSize: '12px !important', color: '#8B949E !important' }} />}
        label="Aguardando"
        sx={{ bgcolor: '#21262D', color: '#8B949E', border: '1px solid #30363D', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
      />
    );
  }
  if (run.status === 'in_progress') {
    return (
      <Chip
        size="small"
        icon={<CircularProgress size={10} sx={{ color: '#58A6FF !important' }} />}
        label="Em execução"
        sx={{ bgcolor: '#1C2A3A', color: '#58A6FF', border: '1px solid #1F6FEB', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
      />
    );
  }
  if (run.conclusion === 'success') {
    return (
      <Chip
        size="small"
        icon={<CheckCircleIcon sx={{ fontSize: '12px !important', color: '#3FB950 !important' }} />}
        label="Sucesso"
        sx={{ bgcolor: '#1A2E1A', color: '#3FB950', border: '1px solid #238636', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
      />
    );
  }
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
    return (
      <Chip
        size="small"
        icon={<ErrorIcon sx={{ fontSize: '12px !important', color: '#F85149 !important' }} />}
        label="Falhou"
        sx={{ bgcolor: '#2D1B1B', color: '#F85149', border: '1px solid #DA3633', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
      />
    );
  }
  if (run.conclusion === 'cancelled') {
    return (
      <Chip
        size="small"
        icon={<CancelIcon sx={{ fontSize: '12px !important', color: '#8B949E !important' }} />}
        label="Cancelado"
        sx={{ bgcolor: '#21262D', color: '#8B949E', border: '1px solid #30363D', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
      />
    );
  }
  return (
    <Chip
      size="small"
      label={run.conclusion ?? run.status}
      sx={{ bgcolor: '#21262D', color: '#8B949E', border: '1px solid #30363D', fontWeight: 600, fontSize: '0.68rem', height: 22 }}
    />
  );
}

interface Props {
  owner: string;
  repo: string;
  repoUrl: string;
}

export function GitHubActionsStatus({ owner, repo, repoUrl }: Props) {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRun = async () => {
    try {
      const res = await fetch(`/github-api/repos/${owner}/${repo}/actions/runs?per_page=1`);
      if (!res.ok) { setError(true); setLoading(false); return; }
      const data = await res.json() as { workflow_runs: WorkflowRun[] };
      setRun(data.workflow_runs?.[0] ?? null);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRun(); }, [owner, repo]);

  useEffect(() => {
    if (!run) return;
    if (run.status !== 'in_progress' && run.status !== 'queued') return;
    const id = setInterval(fetchRun, 5000);
    return () => clearInterval(id);
  }, [run?.status]);

  return (
    <Box sx={{ bgcolor: '#0D1117', borderRadius: 2, p: 2, border: '1px solid #30363D' }}>
      {/* Repo header */}
      <Box display="flex" alignItems="center" gap={1} mb={1.5}>
        <GitHubIcon sx={{ color: '#E6EDF3', fontSize: 16 }} />
        <Typography
          variant="caption"
          fontWeight={700}
          sx={{ color: '#E6EDF3', fontFamily: 'monospace', letterSpacing: '-0.01em' }}
        >
          {owner}/{repo}
        </Typography>
        <Box flex={1} />
        <Link
          href={repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            color: '#58A6FF', textDecoration: 'none', fontSize: '0.7rem',
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          Abrir repositório
          <OpenInNewIcon sx={{ fontSize: 11 }} />
        </Link>
      </Box>

      {/* Actions row */}
      <Box
        sx={{
          bgcolor: '#161B22', borderRadius: 1.5, px: 1.75, py: 1.25,
          border: '1px solid #21262D',
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: '#8B949E', display: 'block', mb: 1, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}
        >
          GitHub Actions
        </Typography>

        {loading && (
          <Box display="flex" flexDirection="column" gap={0.5}>
            <Skeleton variant="text" width={180} sx={{ bgcolor: '#30363D' }} />
            <Skeleton variant="text" width={120} sx={{ bgcolor: '#30363D' }} />
          </Box>
        )}

        {!loading && error && (
          <Typography variant="caption" sx={{ color: '#8B949E' }}>
            Não foi possível carregar o status — verifique as permissões do token.
          </Typography>
        )}

        {!loading && !error && !run && (
          <Typography variant="caption" sx={{ color: '#8B949E' }}>
            Nenhuma execução encontrada. O workflow pode ainda não ter disparado.
          </Typography>
        )}

        {!loading && !error && run && (
          <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
            <Box display="flex" alignItems="center" gap={1.5}>
              <RunStatusChip run={run} />
              <Box>
                <Typography variant="caption" fontWeight={600} sx={{ color: '#E6EDF3', display: 'block', lineHeight: 1.3, fontSize: '0.75rem' }}>
                  {run.name} <span style={{ color: '#8B949E' }}>#{run.run_number}</span>
                </Typography>
                <Typography variant="caption" sx={{ color: '#8B949E', fontSize: '0.68rem' }}>
                  {new Date(run.created_at).toLocaleString('pt-BR')}
                </Typography>
              </Box>
            </Box>
            <Link
              href={run.html_url}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.5,
                color: '#58A6FF', textDecoration: 'none', fontSize: '0.7rem', flexShrink: 0,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              Ver execução
              <OpenInNewIcon sx={{ fontSize: 11 }} />
            </Link>
          </Box>
        )}
      </Box>
    </Box>
  );
}
