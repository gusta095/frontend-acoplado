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
    const repoEndpoint = targetOrg
      ? `/github-api/orgs/${targetOrg}/repos`
      : '/github-api/user/repos';
    const repoOwner = targetOrg || user.login;

    const createRes = await fetch(repoEndpoint, {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoName,
        description: 'Provisionado via Sentinel Fusion Platform',
        private: false,
        auto_init: false,
      }),
    });
    if (createRes.status === 422) {
      throw new Error(`Repositório "${repoName}" já existe em @${repoOwner}`);
    }
    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({})) as { message?: string };
      throw new Error(`Erro ao criar repositório: ${err.message ?? `HTTP ${createRes.status}`}`);
    }

    const ghJson = async <T>(path: string, body: unknown): Promise<T> => {
      const res = await fetch(`/github-api${path}`, {
        method: 'POST',
        headers: { Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(`GitHub API ${path}: ${err.message ?? `HTTP ${res.status}`}`);
      }
      return res.json() as Promise<T>;
    };

    const base = `/repos/${repoOwner}/${repoName}`;

    // 3. Create blobs for each rendered file
    const blobs = await Promise.all(
      files.map(async file => {
        const rendered = renderTemplate(file.content, params);
        const blob = await ghJson<{ sha: string }>(`${base}/git/blobs`, {
          content: toBase64(rendered),
          encoding: 'base64',
        });
        return { path: file.path, sha: blob.sha };
      })
    );

    // 4. Create a tree with all blobs
    const tree = await ghJson<{ sha: string }>(`${base}/git/trees`, {
      tree: blobs.map(b => ({ path: b.path, mode: '100644', type: 'blob', sha: b.sha })),
    });

    // 5. Create a single commit (no parents — initial commit)
    const commit = await ghJson<{ sha: string }>(`${base}/git/commits`, {
      message: 'feat: initial provisioning via Sentinel Fusion Platform',
      tree: tree.sha,
      parents: [],
    });

    // 6. Create the main branch pointing to that commit
    await ghJson(`${base}/git/refs`, {
      ref: 'refs/heads/main',
      sha: commit.sha,
    });

    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;
    return {
      requestId: `gh-${repoName}-${Date.now()}`,
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
