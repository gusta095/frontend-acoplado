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

// Workaround para bug do Rolldown 1.0.x/1.1.x: o chunk styles-*.js é gerado sem
// dois imports de MUI/Emotion. Intercepta a requisição e injeta os imports ausentes.
// Os imports relativos "./foo.js" são reescritos para absolutos com ?v=HASH para que
// o browser use a mesma instância de React que o resto da app (URLs idênticas = mesmo módulo).
// O hash é lido do _metadata.json — estável porque optimizeDeps.include lista todos os
// deps, evitando re-otimização mid-session que mudaria o hash.
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

        const EMOTION_FN = 'init_emotion_react_browser_development_esm'
        const SEP_FN = 'init_StyledEngineProvider'

        const needsEmotionFix = content.includes(`${EMOTION_FN}()`) && !content.includes(`${EMOTION_FN} }`)
        const needsSEPFix = content.includes(`${SEP_FN}()`) && !content.includes(`as ${SEP_FN}`)

        if (!needsEmotionFix && !needsSEPFix) return next()

        const depBase = '/node_modules/.vite/deps/'

        const getHash = (): string => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const h = (server as any).environments?.client?.depsOptimizer?.metadata?.browserHash
            if (h) return h
          } catch { /* ignore */ }
          try {
            const m = JSON.parse(fs.readFileSync(path.join(depsDir, '_metadata.json'), 'utf-8'))
            if (m.browserHash) return m.browserHash
          } catch { /* ignore */ }
          return ''
        }

        const hash = getHash()
        const vSuffix = hash ? `?v=${hash}` : ''

        if (needsEmotionFix) {
          content = `import { t as ${EMOTION_FN} } from "${depBase}@emotion_react.js${vSuffix}";\n` + content
        }
        if (needsSEPFix) {
          const dtFile = content.match(/from "\.\/(defaultTheme-[^"]+\.js)"/)?.[1]
          if (dtFile) {
            content = `import { _t as ${SEP_FN} } from "${depBase}${dtFile}${vSuffix}";\n` + content
          }
        }

        content = content.replace(
          /from "(\.\/([^"]+\.js))"/g,
          (_m, _f, filename) => `from "${depBase}${filename}${vSuffix}"`,
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
    // noDiscovery desabilita o scanner de deps transitivos, evitando re-otimização
    // mid-session que muda o browserHash enquanto o browser já carregou módulos com o hash antigo.
    noDiscovery: true,
    holdUntilCrawlEnd: true,
    include: [
      'react',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      '@emotion/react',
      '@emotion/react/jsx-runtime',
      '@emotion/styled',
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/CssBaseline',
      '@mui/icons-material',
      'js-yaml',
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
