import { load as parseYaml } from 'js-yaml';
import type { MarketplaceApi } from './MarketplaceApi';
import type { Offer, OfferCategory, Provider, ProviderId, ProvisioningRequest, ProvisioningResponse } from '../types';
import { CLOUD_PROVIDERS } from './cloudProviders';
import { templateToOffer, type TemplateYaml } from './templateParser';
import { dispatchProvision } from './dispatchProvision';

export { CLOUD_PROVIDERS };

export interface GitHubClientConfig {
  owner: string;
  repo: string;
  branch: string;
}

export const DEFAULT_GITHUB_CONFIG: GitHubClientConfig = {
  owner: '',
  repo: '',
  branch: 'main',
};

// Suporta HTTPS: https://github.com/owner/repo[/tree/branch]
// Suporta SSH:   git@github.com:owner/repo.git
export function parseGitHubUrl(url: string): GitHubClientConfig | null {
  const s = url.trim();

  const https = s.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/tree\/([^/?#]+))?(?:[/?#].*)?$/
  );
  if (https) return { owner: https[1], repo: https[2], branch: https[3] ?? 'main' };

  const ssh = s.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2], branch: 'main' };

  return null;
}

/**
 * Classe base com toda a lógica de filtragem e cache de ofertas.
 * Subclasses só precisam implementar fetchAllOffers() (como buscar os templates)
 * e provision() (como disparar o provisionamento).
 */
abstract class BaseMarketplaceClient implements MarketplaceApi {
  // Cache por offerId para evitar re-fetch após o primeiro carregamento
  protected cache = new Map<string, Offer>();
  protected providers: Provider[];

  constructor(providers: Provider[]) {
    this.providers = providers;
  }

  protected abstract fetchAllOffers(): Promise<Offer[]>;
  abstract provision(request: ProvisioningRequest): Promise<ProvisioningResponse>;

  // Garante que nunca existam dois template.yaml no mesmo diretório,
  // o que causaria ambiguidade na resolução de ofertas.
  protected checkConflicts(paths: string[]): void {
    const byFolder = new Map<string, string[]>();
    for (const p of paths) {
      const folder = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(raiz)';
      byFolder.set(folder, [...(byFolder.get(folder) ?? []), p]);
    }
    const conflicts = [...byFolder.entries()].filter(([, ps]) => ps.length > 1);
    if (conflicts.length > 0) {
      const detail = conflicts.map(([folder, ps]) => `  ${folder}: ${ps.join(', ')}`).join('\n');
      throw new Error(`Múltiplos template.yaml encontrados na mesma pasta:\n${detail}`);
    }
  }

  // Providers são derivados das ofertas disponíveis, não de uma lista estática,
  // para garantir que só apareçam providers que têm ao menos uma oferta no repositório.
  async getProviders(): Promise<Provider[]> {
    const offers = await this.fetchAllOffers();
    const providerIds = [...new Set(offers.map(o => o.providerId))];
    return providerIds
      .map(id => this.providers.find(p => p.id === id))
      .filter((p): p is Provider => p !== undefined);
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    const offers = await this.fetchAllOffers();
    let filtered = offers.filter(o => o.providerId === providerId);
    if (filters?.category) filtered = filtered.filter(o => o.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async getAllOffers(filters?: { search?: string }): Promise<Offer[]> {
    let offers = await this.fetchAllOffers();
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      offers = offers.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return offers;
  }

  async getOfferById(offerId: string): Promise<Offer> {
    if (this.cache.has(offerId)) return this.cache.get(offerId)!;
    const offers = await this.fetchAllOffers();
    const offer = offers.find(o => o.id === offerId);
    if (offer) return offer;
    throw new Error(`Oferta não encontrada: ${offerId}`);
  }
}

// =============================================================================
// GitHubMarketplaceClient — lê templates diretamente de um repositório GitHub
// via proxy Vite (/github-api → api.github.com). Requer owner/repo configurados.
// =============================================================================

// A GitHub API retorna conteúdo de arquivo codificado em base64 com quebras de linha
// embutidas — atob sozinho não lida bem com UTF-8 multibyte, por isso o TextDecoder.
function decodeBase64(content: string): string {
  const binary = atob(content.replace(/\n/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

export class GitHubMarketplaceClient extends BaseMarketplaceClient {
  private config: GitHubClientConfig;
  // Cache da árvore de arquivos do repo para evitar múltiplas chamadas à Git Trees API
  private blobsCache: { path: string }[] | null = null;

  constructor(config: Partial<GitHubClientConfig> = {}, providers: Provider[] = CLOUD_PROVIDERS) {
    super(providers);
    this.config = { ...DEFAULT_GITHUB_CONFIG, ...config };
  }

  private async ghGet<T>(path: string): Promise<T> {
    const res = await fetch(`/github-api${path}?ref=${this.config.branch}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 403) {
      const body = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(body.error ?? 'Portal sem acesso ao GitHub');
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
    return res.json() as Promise<T>;
  }

  private async fetchTreeBlobs(): Promise<{ path: string }[]> {
    if (this.blobsCache) return this.blobsCache;

    const { owner, repo, branch } = this.config;
    if (!owner || !repo) return [];

    type GHItem = { path: string; type: 'blob' | 'tree'; sha: string };

    const res = await fetch(
      `/github-api/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return [];

    const data = await res.json() as { tree: GHItem[]; truncated: boolean };
    if (!data.truncated) {
      this.blobsCache = data.tree.filter(i => i.type === 'blob');
      return this.blobsCache;
    }

    // Repos com mais de 100k arquivos retornam truncated:true — nesse caso a API
    // não devolve a árvore completa, então percorremos subtree por subtree manualmente.
    const blobs: { path: string }[] = [];

    const traverseSubtree = async (sha: string, prefix: string): Promise<void> => {
      const r = await fetch(
        `/github-api/repos/${owner}/${repo}/git/trees/${sha}`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!r.ok) return;
      const d = await r.json() as { tree: GHItem[] };
      await Promise.all(d.tree.map(item => {
        const fullPath = `${prefix}/${item.path}`;
        if (item.type === 'blob') { blobs.push({ path: fullPath }); return Promise.resolve(); }
        if (item.type === 'tree') return traverseSubtree(item.sha, fullPath);
        return Promise.resolve();
      }));
    };

    const rootRes = await fetch(
      `/github-api/repos/${owner}/${repo}/git/trees/${branch}`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!rootRes.ok) return [];
    const rootData = await rootRes.json() as { tree: GHItem[] };

    await Promise.all(rootData.tree.map(item => {
      if (item.type === 'blob') { blobs.push({ path: item.path }); return Promise.resolve(); }
      if (item.type === 'tree') return traverseSubtree(item.sha, item.path);
      return Promise.resolve();
    }));

    this.blobsCache = blobs;
    return blobs;
  }

  private async fetchTemplateByPath(repoPath: string): Promise<Offer | null> {
    const { owner, repo } = this.config;
    try {
      const file = await this.ghGet<{ content: string }>(
        `/repos/${owner}/${repo}/contents/${repoPath}`
      );
      const tpl = parseYaml(decodeBase64(file.content)) as TemplateYaml;
      return templateToOffer(tpl);
    } catch {
      return null;
    }
  }

  protected async fetchAllOffers(): Promise<Offer[]> {
    const { owner, repo } = this.config;
    if (!owner || !repo) return [];

    let blobs: { path: string }[];
    try {
      blobs = await this.fetchTreeBlobs();
    } catch {
      return [];
    }

    const templatePaths = blobs
      .filter(i => /^template\.ya?ml$/i.test(i.path.split('/').at(-1)!))
      .map(i => i.path);

    this.checkConflicts(templatePaths);

    const results = await Promise.all(templatePaths.map(p => this.fetchTemplateByPath(p)));
    const offers = results.filter((o): o is Offer => o !== null);
    offers.forEach(o => this.cache.set(o.id, o));
    return offers;
  }

  async provision(request: ProvisioningRequest): Promise<ProvisioningResponse> {
    return dispatchProvision({ owner: this.config.owner, repo: this.config.repo }, request);
  }
}

// =============================================================================
// LocalServerMarketplaceClient — lê templates de um diretório local via servidor
// auxiliar de desenvolvimento (/local-templates, exposto pelo vite.config proxy).
// Usado no modo de edição: o usuário aponta para uma pasta na própria máquina.
// Para provision(), o repo GitHub é auto-detectado via `git remote get-url origin`
// do próprio diretório (githubConfig opcional para compatibilidade com OnPremise).
// =============================================================================

// Retorna os caminhos absolutos de todos os template.yaml dentro de `root`
async function scanTemplates(root: string): Promise<string[]> {
  const res = await fetch(`/local-templates?action=scan&path=${encodeURIComponent(root)}`);
  if (!res.ok) return [];
  return res.json() as Promise<string[]>;
}

async function readFile(absPath: string): Promise<string | null> {
  const res = await fetch(`/local-templates?action=read&path=${encodeURIComponent(absPath)}`);
  if (!res.ok) return null;
  const data = await res.json() as { content: string };
  return data.content;
}

export class LocalServerMarketplaceClient extends BaseMarketplaceClient {
  // Mantém o caminho absoluto de cada template para uso futuro (ex.: salvar edições)
  private absPathCache = new Map<string, string>();
  private root: string;
  private githubConfig?: GitHubClientConfig;

  constructor(templatesRoot: string, githubConfig?: GitHubClientConfig, providers: Provider[] = CLOUD_PROVIDERS) {
    super(providers);
    this.root = templatesRoot.replace(/\/+$/, '');
    this.githubConfig = githubConfig;
  }

  private async fetchTemplateYaml(absPath: string): Promise<Offer | null> {
    const content = await readFile(absPath);
    if (!content) return null;
    try {
      const tpl = parseYaml(content) as TemplateYaml;
      const offer = templateToOffer(tpl);
      this.absPathCache.set(offer.id, absPath);
      return offer;
    } catch {
      return null;
    }
  }

  protected async fetchAllOffers(): Promise<Offer[]> {
    const paths = await scanTemplates(this.root);

    this.checkConflicts(paths);

    const results = await Promise.all(paths.map(p => this.fetchTemplateYaml(p)));
    const offers = results.filter((o): o is Offer => o !== null);
    offers.forEach(o => this.cache.set(o.id, o));
    return offers;
  }

  async provision(request: ProvisioningRequest): Promise<ProvisioningResponse> {
    let owner = this.githubConfig?.owner ?? '';
    let repo = this.githubConfig?.repo ?? '';

    // Se não há config explícita, tenta detectar o remote GitHub do repo local
    if (!owner || !repo) {
      try {
        const res = await fetch(`/local-templates?action=remote&path=${encodeURIComponent(this.root)}`);
        if (res.ok) {
          const { remote } = await res.json() as { remote: string };
          const config = parseGitHubUrl(remote);
          if (config) { owner = config.owner; repo = config.repo; }
        }
      } catch { /* ignora — dispatchProvision vai retornar erro adequado */ }
    }

    return dispatchProvision({ owner, repo }, request);
  }
}

// =============================================================================
// MergedMarketplaceClient — agrega múltiplos clientes em uma única interface.
// Roteia provision() para o cliente que originou a oferta, identificado durante
// o primeiro getAllOffers() (offerSource map).
// =============================================================================

export class MergedMarketplaceClient implements MarketplaceApi {
  private clients: MarketplaceApi[];
  // Mapeamento offerId → cliente de origem, populado em fetchAll()
  private offerSource = new Map<string, MarketplaceApi>();

  constructor(clients: MarketplaceApi[]) {
    this.clients = clients;
  }

  private async fetchAll(): Promise<Offer[]> {
    const results = await Promise.allSettled(this.clients.map(c => c.getAllOffers()));
    const seen = new Set<string>();
    const all: Offer[] = [];
    results.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        for (const offer of result.value) {
          if (!this.offerSource.has(offer.id)) {
            this.offerSource.set(offer.id, this.clients[i]);
          }
          // Deduplica por ID: se dois sources tiverem o mesmo template, o primeiro ganha
          if (!seen.has(offer.id)) {
            seen.add(offer.id);
            all.push(offer);
          }
        }
      }
    });
    return all;
  }

  async getProviders(): Promise<Provider[]> {
    const results = await Promise.allSettled(this.clients.map(c => c.getProviders()));
    const byId = new Map<string, Provider>();
    results.forEach(r => {
      if (r.status === 'fulfilled') r.value.forEach(p => byId.set(p.id, p));
    });
    return [...byId.values()];
  }

  async getOffers(providerId: ProviderId, filters?: { category?: OfferCategory; search?: string }): Promise<Offer[]> {
    const all = await this.fetchAll();
    let filtered = all.filter(o => o.providerId === providerId);
    if (filters?.category) filtered = filtered.filter(o => o.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return filtered;
  }

  async getAllOffers(filters?: { search?: string }): Promise<Offer[]> {
    let offers = await this.fetchAll();
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      offers = offers.filter(o =>
        o.name.toLowerCase().includes(q) || o.shortDescription.toLowerCase().includes(q)
      );
    }
    return offers;
  }

  async getOfferById(offerId: string): Promise<Offer> {
    if (!this.offerSource.has(offerId)) await this.fetchAll();
    const client = this.offerSource.get(offerId);
    if (client) return client.getOfferById(offerId);
    throw new Error(`Oferta não encontrada: ${offerId}`);
  }

  async provision(request: ProvisioningRequest): Promise<ProvisioningResponse> {
    if (!this.offerSource.has(request.offerId)) await this.fetchAll();
    const client = this.offerSource.get(request.offerId);
    if (!client) {
      return {
        requestId: '',
        status: 'failed',
        message: `Fonte da oferta não encontrada: ${request.offerId}`,
        timestamp: new Date().toISOString(),
      };
    }
    return client.provision(request);
  }
}

// Cria o cliente adequado a partir de uma string: URL GitHub ou caminho local.
// providers permite sobrescrever a lista de providers (ex.: ON_PREMISE_PROVIDERS).
export function createClientFromSource(source: string, providers?: Provider[]): MarketplaceApi {
  const trimmed = source.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return new GitHubMarketplaceClient(parseGitHubUrl(trimmed) ?? undefined, providers);
  }
  return new LocalServerMarketplaceClient(trimmed, undefined, providers);
}
