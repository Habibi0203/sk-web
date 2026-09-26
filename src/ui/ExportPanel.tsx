import { useCallback, useMemo, useState } from 'react'
import JSZip from 'jszip'
import { splitSheets, type OutputGroup } from '../core/buildModel'
import { rekapFileName, type OutputMode, OUTPUT_MODES } from '../core/naming'
import { buildRekap, buildWorkbook } from '../core/exportXlsx'
import type { BuildModel } from '../core/types'
import { TIPE_XLSX, TIPE_ZIP, unduhBlob, ukuran } from './unduh'

interface Props {
  model: BuildModel
  /** Acuan layout dari template. */
  info: import('../core/readTemplate').TemplateInfo
  templateData: ArrayBuffer | null
  templateSheet: string
}

type Sertakan = {
  lampiran: boolean
  rekapGlobal: boolean
  rekapPerFile: boolean
}

export function ExportPanel({ model, info, templateData, templateSheet }: Props) {
  const [mode, setMode] = useState<OutputMode>('penuh')
  const [sertakan, setSertakan] = useState<Sertakan>({
    lampiran: true,
    rekapGlobal: true,
    rekapPerFile: true,
  })
  const [sibuk, setSibuk] = useState(false)
  const [progres, setProgres] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasil, setHasil] = useState<Array<{ nama: string; ukuran: number }>>([])

  const grup = useMemo(() => splitSheets(model.sheets, mode), [model.sheets, mode])

  const adaIsi = sertakan.lampiran || sertakan.rekapGlobal || sertakan.rekapPerFile
  const siap = templateData !== null && adaIsi

  const jalankan = useCallback(async () => {
    if (!templateData) return
    setSibuk(true)
    setError(null)
    setHasil([])
    const daftar: Array<{ nama: string; ukuran: number }> = []

    try {
      const berkas: Array<{ nama: string; data: ArrayBuffer }> = []

      // --- berkas lampiran (bisa satu atau beberapa, sesuai mode)
      if (sertakan.lampiran) {
        for (let i = 0; i < grup.length; i++) {
          const g = grup[i]
          setProgres(`Menyusun lampiran ${i + 1}/${grup.length} — ${g.label}…`)
          const buf = await buildWorkbook({
            templateData,
            templateSheet,
            info,
            group: g,
            mode,
          })
          berkas.push({ nama: namaLampiran(mode, g), data: buf })
        }
      }

      // --- rekap global (semua kelompok sekaligus)
      if (sertakan.rekapGlobal) {
        setProgres('Menyusun rekap global…')
        const buf = await buildRekap({
          semuaGroup: grup,
          anomalies: model.anomalies,
          judul: 'global',
        })
        berkas.push({ nama: rekapFileName('penuh', 'Semua'), data: buf })
      }

      // --- rekap per berkas
      if (sertakan.rekapPerFile && mode !== 'penuh') {
        for (const g of grup) {
          setProgres(`Menyusun rekap — ${g.label}…`)
          const buf = await buildRekap({
            semuaGroup: [g],
            anomalies: model.anomalies.filter((a) => g.sheets.some((s) => s.name === a.sheet)),
            judul: g.label,
          })
          berkas.push({ nama: rekapFileName(mode, g.label), data: buf })
        }
      }

      // --- unduh: satu berkas langsung, banyak berkas dibungkus ZIP
      if (berkas.length === 1) {
        const b = berkas[0]
        unduhBlob(b.data, b.nama, TIPE_XLSX)
        daftar.push({ nama: b.nama, ukuran: b.data.byteLength })
      } else {
        setProgres(`Membungkus ${berkas.length} berkas menjadi ZIP…`)
        const zip = new JSZip()
        for (const b of berkas) zip.file(b.nama, b.data)
        for (const b of berkas) daftar.push({ nama: b.nama, ukuran: b.data.byteLength })
        const zipBuf = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
        const namaZip = `Lampiran SK - ${labelZip(mode)}.zip`
        unduhBlob(zipBuf, namaZip, TIPE_ZIP)
      }

      setHasil(daftar)
      setProgres('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setProgres('')
    } finally {
      setSibuk(false)
    }
  }, [templateData, templateSheet, model, mode, grup, sertakan])

  return (
    <div className="upload">
      <section className="up-block">
        <header>
          <h3>Mode keluaran</h3>
          <p>Menentukan bagaimana sheet dibagi menjadi berkas Excel.</p>
        </header>
        <div className="mode-grid">
          {OUTPUT_MODES.map((m) => {
            const g = splitSheets(model.sheets, m.id)
            return (
              <button
                key={m.id}
                type="button"
                className={`mode-card ${mode === m.id ? 'is-active' : ''}`}
                onClick={() => setMode(m.id)}
              >
                <span className="mode-title">{m.label}</span>
                <span className="mode-hint">{m.hint}</span>
                <span className="mode-count">
                  {g.length} berkas · {g.reduce((a, x) => a + x.sheets.length, 0)} sheet
                </span>
              </button>
            )
          })}
        </div>

        {mode !== 'penuh' && (
          <div className="mode-preview">
            {grup.map((g) => (
              <span key={g.id} className="tag tag-info">
                {g.label} <b>{g.sheets.length}</b>
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="up-block">
        <header>
          <h3>Sertakan berkas</h3>
        </header>
        <div className="cek-list">
          <Cek
            label="Berkas lampiran SK"
            detail={`${grup.length} berkas`}
            checked={sertakan.lampiran}
            onChange={(v) => setSertakan((s) => ({ ...s, lampiran: v }))}
          />
          <Cek
            label="Rekap global"
            detail="indeks semua lampiran + seluruh daftar perlu dicek"
            checked={sertakan.rekapGlobal}
            onChange={(v) => setSertakan((s) => ({ ...s, rekapGlobal: v }))}
          />
          <Cek
            label="Rekap per berkas"
            detail={mode === 'penuh' ? 'tidak berlaku pada mode rekap penuh' : `${grup.length} berkas`}
            checked={sertakan.rekapPerFile}
            disabled={mode === 'penuh'}
            onChange={(v) => setSertakan((s) => ({ ...s, rekapPerFile: v }))}
          />
        </div>
      </section>

      <div className="up-actions">
        <button type="button" className="btn-primary" disabled={!siap || sibuk} onClick={jalankan}>
          {sibuk ? 'Menyusun berkas…' : 'Susun & unduh'}
        </button>
        {!templateData && (
          <span className="hint">Template belum tersedia — buka menu Pengaturan.</span>
        )}
        {progres && <span className="hint">{progres}</span>}
      </div>

      {error && <div className="alert alert-danger">Gagal menyusun berkas: {error}</div>}

      {hasil.length > 0 && (
        <section className="up-block">
          <header>
            <h3>Berkas yang dihasilkan</h3>
            <p>
              {hasil.length === 1
                ? 'Sudah tersimpan di folder unduhan.'
                : 'Dibungkus dalam satu berkas ZIP di folder unduhan.'}
            </p>
          </header>
          <ul className="filelist">
            {hasil.map((h) => (
              <li key={h.nama}>
                <span className="file-name" title={h.nama}>
                  {h.nama}
                </span>
                <span className="file-size">{ukuran(h.ukuran)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Cek({
  label,
  detail,
  checked,
  disabled,
  onChange,
}: {
  label: string
  detail: string
  checked: boolean
  disabled?: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className={`cek ${disabled ? 'is-off' : ''}`}>
      <input
        type="checkbox"
        checked={checked && !disabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>
        <b>{label}</b>
        <em>{detail}</em>
      </span>
    </label>
  )
}

function namaLampiran(mode: OutputMode, g: OutputGroup): string {
  if (mode === 'penuh') return 'Lampiran SK Penggantian Pendamping.xlsx'
  return `Lampiran SK - ${g.label}.xlsx`
}

function labelZip(mode: OutputMode): string {
  switch (mode) {
    case 'bulan':
      return 'Perbulan'
    case 'angkatan':
      return 'Perangkatan'
    default:
      return 'Rekap Penuh'
  }
}