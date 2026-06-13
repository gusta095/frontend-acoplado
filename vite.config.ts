import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
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
  return {
    name: 'github-token',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/github-token-status')) return next()
        const token = process.env.GITHUB_TOKEN ?? ''
        const configured = token.length > 0
        const preview = configured
          ? `${token.slice(0, 4)}${'*'.repeat(Math.max(0, token.length - 8))}${token.slice(-4)}`
          : null
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.end(JSON.stringify({ configured, preview, source: 'env' as const }))
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localTemplatesPlugin(), githubTokenPlugin()],
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
