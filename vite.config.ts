import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// CSP ketat hanya dipasang pada build produksi.
// Di mode dev, Vite butuh inline script + websocket untuk HMR, jadi CSP tidak dipasang.
//
// CATATAN PENTING soal connect-src:
// `fetch()` diatur oleh connect-src, BUKAN default-src. Nilai 'none' akan memblokir
// SEMUA fetch — termasuk mengambil aset bawaan milik sendiri (template & data periode) —
// sehingga aplikasi tampak "belum dimuat" tanpa pesan error yang jelas.
// 'self' sudah cukup untuk tujuan privasi: koneksi ke domain luar tetap diblokir total.
// Jangan pernah mengubah ini kembali ke 'none'.
//
// `frame-ancestors` sengaja TIDAK dipasang: direktif itu diabaikan browser bila dikirim
// lewat <meta> dan hanya menghasilkan peringatan di konsol. Bila nanti perlu, pasang
// sebagai header HTTP di sisi hosting.
const CSP =
  "default-src 'self'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' blob: data:; " +
  "font-src 'self'; " +
  "connect-src 'self'; " +
  "object-src 'none'; " +
  "base-uri 'self'; " +
  "form-action 'none'"

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
  test: {
    // Pemeriksaan dengan data asli membaca beberapa berkas Excel sekaligus,
    // jadi butuh waktu lebih dari batas bawaan 5 detik.
    testTimeout: 30000,
    hookTimeout: 30000,
  },
})
