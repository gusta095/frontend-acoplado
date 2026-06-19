import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import type { Plugin } from 'vite'

function localTemplatesPlugin(): Plugin {
  return {
    name: 'local-templates',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/local-templates')) return next()

        const url = new URL(req.url, 'http://localhost')
        const action = url.searchParams.get('action')
        const target = url.searchParams.get('path') ?? ''

        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')

        const resolved = target.startsWith('~')
          ? path.join(process.env.HOME ?? '', target.slice(1))
          : target

        if (!resolved || !path.isAbsolute(resolved)) {
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'path param must be an absolute path' }))
          return
        }

        try {
          if (action === 'list') {
            const entries = fs.readdirSync(resolved, { withFileTypes: true })
            res.end(JSON.stringify(
              entries.map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))
            ))
          } else if (action === 'scan') {
            const results: string[] = []
            const walk = (dir: string) => {
              let entries: fs.Dirent[]
              try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
              for (const e of entries) {
                const full = path.join(dir, e.name)
                if (e.isDirectory()) walk(full)
                else if (/^template\.ya?ml$/i.test(e.name)) results.push(full)
              }
            }
            walk(resolved)
            res.end(JSON.stringify(results))
          } else if (action === 'scanAll') {
            const results: string[] = []
            const walk = (dir: string) => {
              let entries: fs.Dirent[]
              try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
              for (const e of entries) {
                const full = path.join(dir, e.name)
                if (e.isDirectory()) walk(full)
                else results.push(full)
              }
            }
            walk(resolved)
            res.end(JSON.stringify(results))
          } else if (action === 'remote') {
            const remote = execSync('git remote get-url origin', {
              cwd: resolved,
              stdio: ['pipe', 'pipe', 'pipe'],
            }).toString().trim()
            res.end(JSON.stringify({ remote }))
          } else {
            const content = fs.readFileSync(resolved, 'utf-8')
            res.end(JSON.stringify({ content }))
          }
        } catch {
          res.statusCode = 404
          res.end(JSON.stringify({ error: `not found: ${resolved}` }))
        }
      })
    },
  }
}

function githubTokenPlugin(): Plugin {
  // Estado em memória: começa habilitado se o token já está configurado no ambiente.
  // O cliente sincroniza esse flag via /github-toggle ao ativar/desativar a integração.
  let githubEnabled = !!process.env.GITHUB_TOKEN

  return {
    name: 'github-token',
    configureServer(server) {
      // Guard: intercepta /github-api antes do proxy — bloqueia quando integração está inativa
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/github-api')) return next()
        if (!githubEnabled) {
          res.statusCode = 403
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ error: 'Portal sem acesso ao GitHub — ative a integração nas Configurações' }))
          return
        }
        next()
      })

      // Status do token + estado ativo/inativo
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/github-token-status')) return next()
        const token = process.env.GITHUB_TOKEN ?? ''
        const configured = token.length > 0
        const preview = configured
          ? `${token.slice(0, 4)}${'*'.repeat(Math.max(0, token.length - 8))}${token.slice(-4)}`
          : null
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(JSON.stringify({ configured, preview, source: 'env' as const, enabled: githubEnabled }))
      })

      // Toggle: POST /github-toggle { enabled: boolean }
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/github-toggle') || req.method !== 'POST') return next()
        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const { enabled } = JSON.parse(body) as { enabled: boolean }
            githubEnabled = Boolean(enabled)
          } catch { /* body inválido, mantém estado atual */ }
          res.setHeader('Content-Type', 'application/json')
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(JSON.stringify({ enabled: githubEnabled }))
        })
      })
    },
  }
}

// workaround para bug do rolldown (presente nas versões 1.0.x e 1.1.x): o chunk
// compartilhado styles-*.js é gerado sem dois imports de MUI/Emotion. Intercepta
// a requisição HTTP do browser e injeta os imports ausentes antes de servir.
//
// IMPORTANTE: ao servir o conteúdo diretamente, precisamos replicar o rewrite de
// URLs que o Vite normalmente faz: "./foo.js" → "/node_modules/.vite/deps/foo.js?v=HASH".
// Sem isso, o browser carrega instâncias diferentes do React (com/sem ?v=) e o
// dispatcher fica null, causando "Cannot read properties of null (reading 'useDebugValue')".
//
// O ?v= correto NÃO é o browserHash global do _metadata.json — cada dep pode ter
// seu próprio browserHash atualizado em memória após ciclos de re-otimização.
// Lemos o hash diretamente do depsOptimizer ativo do servidor para garantir que
// usamos exatamente o mesmo ?v= que o Vite está servindo no momento da requisição.
function fixRolldownEmotionChunk(): Plugin {
  return {
    name: 'fix-rolldown-emotion-chunk',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const depPath = req.url?.split('?')[0]
        if (!depPath?.match(/\/node_modules\/\.vite\/deps\/styles-[^/]+\.js$/)) return next()

        const depsDir = path.join(process.cwd(), 'node_modules/.vite/deps')
        const filePath = path.join(depsDir, path.basename(depPath))
        if (!fs.existsSync(filePath)) return next()

        let content = fs.readFileSync(filePath, 'utf-8')
        let patched = false

        const depBase = '/node_modules/.vite/deps/'

        // Obtém o ?v= correto para cada dep consultando o depsOptimizer ao vivo.
        // O Vite atribui browserHash individualmente a cada entrada (pode mudar entre
        // ciclos de re-otimização por descoberta de deps), então não podemos usar o
        // browserHash global do _metadata.json — ele pode já estar desatualizado.
        const getVSuffix = (filename: string): string => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const meta = (server as any).environments?.client?.depsOptimizer?.metadata
            if (meta) {
              const absFile = path.join(depsDir, filename)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const entry = meta.depInfoList?.find((d: any) => d.file === absFile)
              const hash = entry?.browserHash ?? meta.browserHash
              if (hash) return `?v=${hash}`
            }
          } catch { /* server ainda não inicializado */ }
          // fallback: lê do disco
          try {
            const m = JSON.parse(fs.readFileSync(path.join(depsDir, '_metadata.json'), 'utf-8'))
            if (m.browserHash) return `?v=${m.browserHash}`
          } catch { /* sem metadata */ }
          return ''
        }

        // fix 1: init_emotion_react_browser_development_esm chamada sem import
        const EMOTION_FN = 'init_emotion_react_browser_development_esm'
        if (content.includes(`${EMOTION_FN}()`) && !content.includes(`${EMOTION_FN} }`)) {
          content = `import { t as ${EMOTION_FN} } from "${depBase}@emotion_react.js${getVSuffix('@emotion_react.js')}";\n` + content
          patched = true
        }

        // fix 2: init_StyledEngineProvider chamada sem definição
        // existe em identifier-*.js exportada como "tt" — detecta nome do chunk pelo import existente
        const SEP_FN = 'init_StyledEngineProvider'
        if (content.includes(`${SEP_FN}()`) && !content.includes(`as ${SEP_FN}`)) {
          const identifierFile = content.match(/from "\.\/(identifier-[^"]+\.js)"/)?.[1]
          if (identifierFile) {
            content = `import { tt as ${SEP_FN} } from "${depBase}${identifierFile}${getVSuffix(identifierFile)}";\n` + content
            patched = true
          }
        }

        if (!patched) return next()

        // replica o rewrite de URLs que o Vite faz normalmente:
        // "./foo.js" → "/node_modules/.vite/deps/foo.js?v=HASH"
        content = content.replace(
          /from "(\.\/([^"]+\.js))"/g,
          (_match, _full, filename) => `from "${depBase}${filename}${getVSuffix(filename)}"`,
        )

        res.setHeader('Content-Type', 'application/javascript')
        res.setHeader('Cache-Control', 'no-cache')
        res.end(content)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localTemplatesPlugin(), githubTokenPlugin(), fixRolldownEmotionChunk()],
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@emotion/react/jsx-runtime',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/github-api': {
        target: 'https://api.github.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/github-api/, ''),
        headers: {
          Authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ''}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    },
  },
})
