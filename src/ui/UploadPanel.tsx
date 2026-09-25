import { useRef } from 'react'
import { MONTHS_ID } from '../core/constants'
import type { PipelineState } from '../app/usePipeline'

interface Props {
  p: PipelineState
}

export function UploadPanel({ p }: Props) {
  return (
    <div className="upload">
      <section className="up-block">
        <header>
          <h3>1. Berkas data mentah</h3>
          <p>Boleh berapa saja. Bulan ditebak dari nama berkas — bisa dikoreksi bila salah.</p>
        </header>

        <RawPicker onPick={p.tambahRaw} />

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

      <div className="up-row">
        <section className="up-block">
          <header>
            <h3>2. Berkas template</h3>
            <p>Acuan layout: lebar kolom, header, dan blok tanda tangan.</p>
          </header>
          <SinglePicker
            accept=".xlsx"
            value={p.template?.name ?? null}
            onPick={(f) => p.setTemplate(f)}
          />
        </section>

        <section className="up-block">
          <header>
            <h3>3. Rekapitulasi periode</h3>
            <p>Sumber tanggal akhir periode (berkas .docx).</p>
          </header>
          <SinglePicker accept=".docx" value={p.docx?.name ?? null} onPick={(f) => p.setDocx(f)} />
        </section>
      </div>

      <div className="up-actions">
        <button type="button" className="btn-primary" disabled={!p.siapProses || p.busy} onClick={p.proses}>
          {p.busy ? 'Memproses…' : 'Proses data'}
        </button>
        {(p.raw.length > 0 || p.template || p.docx) && (
          <button type="button" className="btn-ghost" onClick={p.reset}>
            Bersihkan
          </button>
        )}
        {!p.siapProses && (
          <span className="hint">
            Lengkapi berkas mentah, template, dan rekapitulasi. Pastikan bulan tiap berkas mentah sudah dipilih.
          </span>
        )}
      </div>

      {p.error && <div className="alert alert-danger">{p.error}</div>}
    </div>
  )
}

function RawPicker({ onPick }: { onPick: (f: FileList) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="drop">
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xlsm"
        multiple
        onChange={(e) => {
          if (e.target.files?.length) onPick(e.target.files)
          e.target.value = ''
        }}
      />
      <button type="button" className="btn-ghost" onClick={() => ref.current?.click()}>
        Pilih berkas mentah
      </button>
      <span className="hint">Bisa pilih beberapa berkas sekaligus</span>
    </div>
  )
}

function SinglePicker({
  accept,
  value,
  onPick,
}: {
  accept: string
  value: string | null
  onPick: (f: File | null) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="drop">
      <input
        ref={ref}
        type="file"
        accept={accept}
        onChange={(e) => {
          onPick(e.target.files?.[0] ?? null)
          e.target.value = ''
        }}
      />
      <button type="button" className="btn-ghost" onClick={() => ref.current?.click()}>
        {value ? 'Ganti berkas' : 'Pilih berkas'}
      </button>
      {value ? <span className="file-name" title={value}>{value}</span> : <span className="hint">Belum ada berkas</span>}
    </div>
  )
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
