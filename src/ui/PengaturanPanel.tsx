import { useEffect, useRef, useState } from 'react'
import type { PipelineState } from '../app/usePipeline'

interface Props {
  p: PipelineState
}

export function PengaturanPanel({ p }: Props) {
  const tplSig = p.aset.template?.sig ?? []
  const sigAktif = p.aset.sig ?? tplSig
  const [baris, setBaris] = useState<string[]>(['', '', ''])
  const refTpl = useRef<HTMLInputElement>(null)
  const refDocx = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setBaris([sigAktif[0] ?? '', sigAktif[1] ?? '', sigAktif[2] ?? ''])
  }, [sigAktif.join('\u0000')])

  const namaTpl = p.aset.template?.fileName ?? '—'
  const sumberEd = p.aset.endDatesMeta?.sumber ?? '—'
  const dibuatEd = p.aset.endDatesMeta?.dibuat ?? '—'

  return (
    <div className="upload">
      <section className="up-block">
        <header>
          <h3>Teks tanda tangan</h3>
          <p>
            Bagian yang paling sering berubah adalah <b>baris ketiga</b> (nama penandatangan).
            Perubahan tersimpan di browser dan langsung dipakai saat menghasilkan berkas.
          </p>
        </header>

        {['Baris 1 — jabatan', 'Baris 2 — unit', 'Baris 3 — nama penandatangan'].map((label, i) => (
          <label key={i} className="field">
            <span>{label}</span>
            <input
              type="text"
              value={baris[i] ?? ''}
              placeholder={tplSig[i] ?? ''}
              onChange={(e) => {
                const next = [...baris]
                next[i] = e.target.value
                setBaris(next)
              }}
            />
          </label>
        ))}

        <div className="up-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => p.perbaruiSig(baris)}
            disabled={baris.every((b) => b.trim() === '')}
          >
            Simpan perubahan
          </button>
          {p.aset.sig && (
            <button type="button" className="btn-ghost" onClick={() => p.pulihkan('sig')}>
              Kembalikan ke isi template
            </button>
          )}
          {p.aset.sig && <span className="tag tag-warn">sedang ditimpa</span>}
        </div>
      </section>

      <div className="up-row">
        <section className="up-block">
          <header>
            <h3>Rekapitulasi periode</h3>
            <p>
              Sumber tanggal akhir periode. Diperbarui <b>tiap 3–4 bulan</b> bila ada angkatan baru.
            </p>
          </header>
          <div className="bawaan">
            <span className="dot-ok" />
            <span>
              {sumberEd} — {dibuatEd} — {p.aset.endDates?.size ?? 0} entri
              {p.aset.asalEndDates === 'tersimpan' ? ' (diperbarui)' : ' (bawaan)'}
            </span>
          </div>
          <div className="up-actions">
            <button type="button" className="btn-ghost" onClick={() => refDocx.current?.click()}>
              Perbarui berkas
            </button>
            {p.aset.asalEndDates === 'tersimpan' && (
              <button type="button" className="btn-x" onClick={() => p.pulihkan('enddates')}>
                Kembalikan ke bawaan
              </button>
            )}
          </div>
          <input
            ref={refDocx}
            type="file"
            accept=".docx"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) p.perbaruiPeriode(f)
              e.target.value = ''
            }}
          />
        </section>

        <section className="up-block">
          <header>
            <h3>Berkas template</h3>
            <p>Acuan layout. Jarang berubah, kecuali format dokumennya diganti.</p>
          </header>
          <div className="bawaan">
            <span className="dot-ok" />
            <span>
              {namaTpl}
              {p.aset.asalTemplate === 'tersimpan' ? ' (diperbarui)' : ' (bawaan)'}
            </span>
          </div>
          <div className="up-actions">
            <button type="button" className="btn-ghost" onClick={() => refTpl.current?.click()}>
              Perbarui berkas
            </button>
            {p.aset.asalTemplate === 'tersimpan' && (
              <button type="button" className="btn-x" onClick={() => p.pulihkan('template')}>
                Kembalikan ke bawaan
              </button>
            )}
          </div>
          <input
            ref={refTpl}
            type="file"
            accept=".xlsx"
            className="hidden-input"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) p.perbaruiTemplate(f)
              e.target.value = ''
            }}
          />
        </section>
      </div>

      <p className="hint">
        Semua pembaruan tersimpan di browser Master, tidak dikirim ke server. Data hilang bila
        riwayat browser dibersihkan — saat itu aplikasi akan memakai bawaan lagi.
      </p>
    </div>
  )
}
