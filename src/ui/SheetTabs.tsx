import { useMemo, useState } from 'react'
import { toRoman } from '../core/text'
import type { SheetModel } from '../core/types'

interface Props {
  sheets: readonly SheetModel[]
  active: number
  onSelect: (i: number) => void
  /** Jumlah sel yang disunting per sheet, untuk penanda. */
  editPerSheet?: Map<string, number>
}

/**
 * Daftar sheet dengan pencarian dan pengelompokan per angkatan.
 * Berguna karena satu berkas bisa berisi sampai 60 sheet.
 */
export function SheetTabs({ sheets, active, onSelect, editPerSheet }: Props) {
  const [cari, setCari] = useState('')

  const kelompok = useMemo(() => {
    const q = cari.trim().toUpperCase()
    const cocok = sheets
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => {
        if (!q) return true
        return (
          s.name.toUpperCase().includes(q) ||
          s.key.prov.toUpperCase().includes(q) ||
          s.key.program.includes(q)
        )
      })

    const m = new Map<string, Array<{ s: SheetModel; i: number }>>()
    for (const x of cocok) {
      const k = `${toRoman(x.s.key.angkatan)} · ${x.s.key.tahun}`
      const arr = m.get(k)
      if (arr) arr.push(x)
      else m.set(k, [x])
    }
    return [...m]
  }, [sheets, cari])

  const totalCocok = kelompok.reduce((a, [, v]) => a + v.length, 0)

  return (
    <aside className="daftar-sheet">
      <div className="cari">
        <IkonCari />
        <input
          type="text"
          value={cari}
          placeholder="Cari sheet, provinsi, program…"
          onChange={(e) => setCari(e.target.value)}
          aria-label="Cari sheet"
        />
        {cari && (
          <button type="button" className="cari-hapus" onClick={() => setCari('')} aria-label="Bersihkan pencarian">
            ×
          </button>
        )}
      </div>

      <div className="daftar-info">
        {cari ? `${totalCocok} dari ${sheets.length} sheet` : `${sheets.length} sheet`}
      </div>

      <div className="daftar-isi">
        {kelompok.length === 0 && <p className="hint daftar-kosong">Tidak ada sheet yang cocok.</p>}

        {kelompok.map(([judul, isi]) => (
          <div key={judul} className="kelompok">
            <div className="kelompok-judul">
              <span>{judul}</span>
              <span className="kelompok-jml">{isi.length}</span>
            </div>
            {isi.map(({ s, i }) => {
              const edit = editPerSheet?.get(s.name) ?? 0
              return (
                <button
                  key={s.name}
                  type="button"
                  className={`sheet-item ${i === active ? 'is-active' : ''}`}
                  aria-current={i === active ? 'true' : undefined}
                  onClick={() => onSelect(i)}
                  title={`${s.name} — ${s.rows.length} baris`}
                >
                  <span className="sheet-warna" style={{ background: `#${s.tabColor}` }} aria-hidden="true" />
                  <span className="sheet-nama">{s.name}</span>
                  {edit > 0 && <span className="sheet-edit" title={`${edit} sel disunting`}>✎{edit}</span>}
                  <span className="sheet-jml">{s.rows.length}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}

function IkonCari() {
  return (
    <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" className="cari-ikon">
      <circle cx="7" cy="7" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10.4 10.4 13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}