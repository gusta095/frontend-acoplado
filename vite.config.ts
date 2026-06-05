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

export default defineConfig({
  plugins: [react(), localTemplatesPlugin()],
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
