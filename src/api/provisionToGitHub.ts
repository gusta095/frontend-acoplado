import type { ParameterValue, ProvisioningResponse } from '../types';

export interface SkeletonFile {
  path: string;
  content: string;
}

export function renderTemplate(content: string, params: Record<string, ParameterValue>): string {
  // Strip {% raw %} / {% endraw %} so GitHub Actions ${{ }} syntax is preserved
  let out = content
    .replace(/\{%-?\s*raw\s*-?%\}/g, '')
    .replace(/\{%-?\s*endraw\s*-?%\}/g, '');

  // {{ key | lower }}
  out = out.replace(/\{\{\s*(\w+)\s*\|\s*lower\s*\}\}/g, (_, k: string) =>
    k in params ? String(params[k]).toLowerCase() : `{{ ${k} | lower }}`
  );

  // {{ key }}
  out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    k in params ? String(params[k]) : `{{ ${k} }}`
  );

  return out;
}

function toBase64(str: string): string {
  return btoa(unescape(encodeURIComponent(str)));
}

export async function provisionToGitHub(
  repoName: string,
  files: SkeletonFile[],
  params: Record<string, ParameterValue>,
): Promise<ProvisioningResponse> {
  const timestamp = new Date().toISOString();

  try {
    // 1. Resolve authenticated user
    const userRes = await fetch('/github-api/user', {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!userRes.ok) {
      throw new Error('Falha na autenticação com o GitHub — verifique se GITHUB_TOKEN está configurado');
    }
    const user = await userRes.json() as { login: string };

    // 2. Create repository — under org if configured, otherwise under authenticated user
    const targetOrg = (localStorage.getItem('integracoes:github:org') ?? '').trim();
    const repoOwner = targetOrg || user.login;

    const repoEndpoint = targetOrg ? `/github-api/orgs/${targetOrg}/repos` : '/github-api/user/repos';
    const createRes = await fetch(repoEndpoint, {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoName,
        description: 'Provisionado via Sentinel Fusion Platform',
        private: true,
        auto_init: true,
      }),
    });
    if (createRes.status === 422) {
      throw new Error(`Repositório "${repoName}" já existe em @${repoOwner}`);
    }
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Erro ao criar repositório: ${err.message ?? `HTTP ${createRes.status}`}`);
    }

    const effectiveRepo = repoName;

    const base = `/repos/${repoOwner}/${effectiveRepo}`;

    // Helper for POST requests to the Git Data API — retries up to 3× on 5xx
    const ghPost = async <T>(path: string, body: unknown): Promise<T> => {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const res = await fetch(`/github-api${path}`, {
          method: 'POST',
          headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (res.ok) return res.json() as Promise<T>;
        const err = await res.json().catch(() => ({})) as { message?: string };
        // Retry on server errors (5xx) — git database may not be ready yet after auto_init
        if (res.status >= 500 && attempt < maxAttempts) {
          await new Promise(r => setTimeout(r, attempt * 2000));
          continue;
        }
        throw new Error(`GitHub API ${path}: ${err.message ?? `HTTP ${res.status}`}`);
      }
      throw new Error(`GitHub API ${path}: max retries exceeded`);
    };

    // 3. Get the HEAD commit SHA created by auto_init (the initial README commit)
    const refRes = await fetch(`/github-api${base}/git/ref/heads/main`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!refRes.ok) {
      const err = await refRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Erro ao ler ref principal: ${err.message ?? `HTTP ${refRes.status}`}`);
    }
    const refData = await refRes.json() as { object: { sha: string } };
    const headSha = refData.object.sha;

    // 4. Create blobs for each rendered file
    const blobs = await Promise.all(
      files.map(async file => {
        const rendered = renderTemplate(file.content, params);
        const blob = await ghPost<{ sha: string }>(`${base}/git/blobs`, {
          content: toBase64(rendered),
          encoding: 'base64',
        });
        return { path: file.path, sha: blob.sha };
      })
    );

    // 5. Create a tree with all blobs (no base_tree — replaces README from auto_init)
    const tree = await ghPost<{ sha: string }>(`${base}/git/trees`, {
      tree: blobs.map(b => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
    });

    // 6. Create commit on top of the initial commit
    const commit = await ghPost<{ sha: string }>(`${base}/git/commits`, {
      message: 'feat: initial provisioning via Sentinel Fusion Platform',
      tree: tree.sha,
      parents: [headSha],
    });

    // 7. Update main branch to point to the new commit
    const patchRes = await fetch(`/github-api${base}/git/refs/heads/main`, {
      method: 'PATCH',
      headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ sha: commit.sha, force: true }),
    });
    if (!patchRes.ok) {
      const err = await patchRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Erro ao atualizar branch: ${err.message ?? `HTTP ${patchRes.status}`}`);
    }

    const repoUrl = `https://github.com/${repoOwner}/${effectiveRepo}`;
    return {
      requestId: repoUrl,
      status: 'accepted',
      message: `Repositório criado: ${repoUrl}`,
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
