import type { ProvisioningRequest, ProvisioningResponse } from '../types';

export async function dispatchProvision(
  templateRepo: { owner: string; repo: string },
  request: ProvisioningRequest,
): Promise<ProvisioningResponse> {
  const repoName  = String(request.parameters.repo_name ?? `${request.offerId}-${Date.now()}`);
  const timestamp = new Date().toISOString();

  const { owner, repo } = templateRepo;
  if (!owner || !repo) {
    return { requestId: '', status: 'failed', message: 'Repositório de templates não configurado', timestamp };
  }

  const targetOrg = (localStorage.getItem('integracoes:github:org') ?? '').trim();
  let repoOwner = targetOrg;
  if (!repoOwner) {
    try {
      const userRes = await fetch('/github-api/user', { headers: { Accept: 'application/vnd.github+json' } });
      if (!userRes.ok) throw new Error();
      const user = await userRes.json() as { login: string };
      repoOwner = user.login;
    } catch {
      return {
        requestId: '',
        status: 'failed',
        message: 'Falha na autenticação com o GitHub — verifique se GITHUB_TOKEN está configurado',
        timestamp,
      };
    }
  }

  try {
    const res = await fetch(`/github-api/repos/${owner}/${repo}/dispatches`, {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'provision',
        client_payload: {
          repo_name: repoName,
          offer_id:  request.offerId,
          org:       repoOwner,
          params: {
            ...request.parameters,
            provider: request.providerId,
          },
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { message?: string };
      return {
        requestId: '',
        status: 'failed',
        message: `Erro ao disparar workflow: ${err.message ?? `HTTP ${res.status}`}`,
        timestamp,
      };
    }

    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    return {
      requestId: repoUrl,
      status: 'accepted',
      message: `Provisionamento iniciado — repositório: ${repoUrl}`,
      timestamp,
    };
  } catch (e) {
    return {
      requestId: '',
      status: 'failed',
      message: e instanceof Error ? e.message : 'Erro desconhecido no provisionamento',
      timestamp,
    };
  }
}
