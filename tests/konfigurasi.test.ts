import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'

/**
 * Penjaga konfigurasi build.
 *
 * Tes-tes lain berjalan di Node, jadi TIDAK melihat CSP yang dipasang ke HTML produksi.
 * Akibatnya sebuah bug nyata lolos: `connect-src 'none'` memblokir semua `fetch()`,
 * termasuk pengambilan aset bawaan milik aplikasi sendiri — sehingga aplikasi tampak
 * "belum dimuat" padahal server sehat dan konsol bersih. Bug itu hanya ketahuan
 * lewat pengujian di browser sungguhan.
 *
 * Tes ini membaca konfigurasi langsung, jadi bisa menangkap kekeliruan seperti itu
 * tanpa perlu menjalankan browser.
 */

const CONFIG = 'vite.config.ts'

describe('CSP pada vite.config.ts', () => {
  it('berkas konfigurasi ada', () => {
    expect(existsSync(CONFIG)).toBe(true)
  })

  const src = existsSync(CONFIG) ? readFileSync(CONFIG, 'utf8') : ''

  /** Hanya isi string CSP-nya — komentar penjelasan tidak ikut dinilai. */
  function barisCsp(s: string): string {
    const start = s.indexOf('const CSP')
    const end = s.indexOf('\n\n', start)
    const blok = start >= 0 ? s.slice(start, end > start ? end : undefined) : ''
    return blok
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join(' ')
  }

  const csp = barisCsp(src)

  it('connect-src BUKAN none — fetch() memakai connect-src, bukan default-src', () => {
    // Baris ini menangkap bug yang pernah terjadi: 'none' memblokir fetch ke aset sendiri.
    expect(csp).not.toMatch(/connect-src\s+'none'/)
    expect(csp).toMatch(/connect-src\s+'self'/)
  })

  it('tidak memuat skrip atau gaya dari domain luar', () => {
    expect(csp).toMatch(/script-src\s+'self'/)
    expect(csp).toMatch(/default-src\s+'self'/)
    // Tidak boleh ada CDN apa pun
    expect(csp).not.toMatch(/https?:\/\/(cdn|unpkg|jsdelivr|esm\.sh)/)
  })

  it('object-src dinonaktifkan', () => {
    expect(csp).toMatch(/object-src\s+'none'/)
  })

  it('frame-ancestors TIDAK dipasang lewat meta (diabaikan browser, hanya bikin peringatan)', () => {
    expect(csp).not.toMatch(/frame-ancestors/)
  })

  it('CSP hanya dipasang saat build produksi, bukan saat dev', () => {
    // Mode dev butuh inline script + websocket untuk HMR.
    expect(src).toMatch(/apply:\s*'build'/)
  })

  it('base relatif supaya aman di root domain maupun sub-path', () => {
    expect(src).toMatch(/base:\s*'\.\/'/)
  })

  it('sourcemap dimatikan di produksi', () => {
    expect(src).toMatch(/sourcemap:\s*false/)
  })
})

describe('aset bawaan harus ada di public/', () => {
  const wajib = [
    'public/template-default.xlsx',
    'public/enddates-default.json',
  ]

  for (const f of wajib) {
    it(`${f} tersedia`, () => {
      expect(existsSync(f), `${f} hilang — aplikasi tidak akan bisa memakai aset bawaan`).toBe(true)
    })
  }

  it('data periode bawaan tidak memuat nama orang atau email', () => {
    const json = readFileSync('public/enddates-default.json', 'utf8')
    expect(json).not.toMatch(/\b(dr|drg)\./)
    expect(json).not.toMatch(/[\w.+-]+@[\w-]+\.[A-Za-z]{2,}/)
  })

  it('data periode bawaan berisi entri yang cukup', () => {
    const json = JSON.parse(readFileSync('public/enddates-default.json', 'utf8')) as {
      entri: unknown[]
    }
    expect(json.entri.length).toBeGreaterThan(400)
  })
})

describe('pengaman .gitignore', () => {
  const gi = existsSync('.gitignore') ? readFileSync('.gitignore', 'utf8') : ''

  it('memblokir berkas data pribadi', () => {
    for (const pola of ['*.xlsx', '*.docx', '*.csv', '*.pdf', '*.zip']) {
      expect(gi, `pola ${pola} hilang dari .gitignore`).toContain(pola)
    }
  })

  it('memblokir berkas kredensial', () => {
    expect(gi).toContain('.git-credentials')
    expect(gi).toContain('.netrc')
  })

  it('tetap mengizinkan aset template aplikasi', () => {
    expect(gi).toContain('!public/template-default.xlsx')
  })

  it('mengabaikan keluaran build dan berkas sementara', () => {
    for (const pola of ['node_modules/', 'dist/', '*.tsbuildinfo']) {
      expect(gi, `pola ${pola} hilang`).toContain(pola)
    }
    expect(gi).toMatch(/vite\.config\.ts\.timestamp/)
  })

  it('mengabaikan pemeriksaan lokal yang menunjuk data pribadi', () => {
    expect(gi).toMatch(/tests\/_\*\.local\.test\.ts/)
  })
})