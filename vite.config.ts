import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// CSP ketat hanya dipasang pada build produksi.
// Di mode dev, Vite butuh inline script + websocket untuk HMR, jadi CSP tidak dipasang.
const CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' blob: data:; " +
  "font-src 'self'; " +
  "connect-src 'none'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'none'; " +
  "frame-ancestors 'none'"

function cspOnBuild(): Plugin {
  return {
    name: 'csp-on-build',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<head>',
        `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}">`
      )
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [react(), cspOnBuild()],
  build: {
    sourcemap: false,
    target: 'es2022',
  },
})
