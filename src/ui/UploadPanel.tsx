import { useRef } from 'react'
import { MONTHS_ID } from '../core/constants'
import type { PipelineState } from '../app/usePipeline'

interface Props {
  p: PipelineState
  kePengaturan: () => void
}

export function UploadPanel({ p, kePengaturan }: Props) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    <div className="upload">
      <section className="up-block">
        <header>
          <h3>Berkas data mentah</h3>
          <p>
            Boleh berapa saja. Bulan ditebak dari nama berkas — bisa dikoreksi bila salah.
            Template dan rekapitulasi periode tidak perlu diunggah (sudah tersedia bawaan).
          </p>
        </header>

        <div className="drop">
          <input
            ref={ref}
            type="file"
            accept=".xlsx,.xlsm"
            multiple
            className="hidden-input"
            onChange={(e) => {
              if (e.target.files?.length) p.tambahRaw(e.target.files)
              e.target.value = ''
            }}
          />
          <button type="button" className="btn-ghost" onClick={() => ref.current?.click()}>
            Pilih berkas mentah
          </button>
          <span className="hint">Bisa pilih beberapa berkas sekaligus</span>
        </div>

        {p.raw.length > 0 && (
          <ul className="filelist">
            {p.raw.map((r) => (
              <li key={r.file.name}>
                <span className="file-name" title={r.file.name}>
                  {r.file.name}
                </span>
                <span className="file-size">{formatSize(r.file.size)}</span>
                <select
                  className={r.bulan === null ? 'is-warn' : ''}
                  value={r.bulan ?? ''}
                  onChange={(e) =>
                    p.setBulan(r.file.name, e.target.value === '' ? null : Number(e.target.value))
                  }
                  aria-label={`Bulan untuk ${r.file.name}`}
                >
                  <option value="">— pilih bulan —</option>
                  {MONTHS_ID.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
                {r.tebakanBulan !== null && r.tebakanBulan !== r.bulan && (
                  <span className="tag tag-warn">dikoreksi</span>
                )}
                <button type="button" className="btn-x" onClick={() => p.hapusRaw(r.file.name)}>
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="up-block">
        <header>
          <h3>Aset yang dipakai</h3>
          <p>Template dan rekapitulasi periode sudah tersedia. Ganti bila memang perlu.</p>
        </header>
        <div className="bawaan">
          <span className="dot-ok" />
          <span>
            Template: {p.aset.template ? p.aset.template.fileName : 'belum dimuat'}
            {p.aset.asalTemplate === 'tersimpan' ? ' (diperbarui)' : ' (bawaan)'}
          </span>
          <button type="button" className="btn-x" onClick={kePengaturan}>
            Kelola
          </button>
        </div>
        <div className="bawaan">
          <span className="dot-ok" />
          <span>
            Periode: {p.aset.endDatesMeta?.sumber ?? 'belum dimuat'} (
            {p.aset.endDatesMeta?.dibuat ?? '-'}) — {p.aset.endDates?.size ?? 0} entri
            {p.aset.asalEndDates === 'tersimpan' ? ' (diperbarui)' : ' (bawaan)'}
          </span>
          <button type="button" className="btn-x" onClick={kePengaturan}>
            Kelola
          </button>
        </div>
        {p.aset.error && (
          <div className="alert alert-warn">
            Aset gagal dimuat: {p.aset.error}. Buka menu Pengaturan untuk mengunggah berkasnya.
          </div>
        )}
      </section>

      <div className="up-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={!p.siapProses || p.busy}
          onClick={p.proses}
        >
          {p.busy ? 'Memproses…' : 'Proses data'}
        </button>
        {(p.raw.length > 0 || p.template || p.docx) && (
          <button type="button" className="btn-ghost" onClick={p.reset}>
            Bersihkan
          </button>
        )}
        {!p.siapProses && (
          <span className="hint">
            Unggah berkas data mentah dan pastikan bulan tiap berkas sudah dipilih.
          </span>
        )}
      </div>

      {p.error && <div className="alert alert-danger">{p.error}</div>}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
