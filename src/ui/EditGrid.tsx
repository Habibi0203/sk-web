import { useMemo } from 'react'
import { OUT_HEADERS } from '../core/constants'
import { KOLOM_EDIT, kunciEdit, type EditMap } from '../storage/edits'
import type { SheetModel } from '../core/types'

interface Props {
  sheet: SheetModel
  edit: EditMap
  onEdit: (kunci: string, nilai: string | null) => void
  /** Ada editan di sheet ini? dipakai untuk tombol reset. */
  onResetSheet: () => void
}

export function EditGrid({ sheet, edit, onEdit, onResetSheet }: Props) {
  const jmlEdit = useMemo(
    () => [...edit.keys()].filter((k) => k.startsWith(`${sheet.name}|`)).length,
    [edit, sheet.name]
  )

  return (
    <div className="edit">
      <div className="edit-head">
        <div>
          <h3>{sheet.name}</h3>
          <p className="hint">
            Sel yang bisa disunting ditandai. Perubahan langsung dipakai saat berkas disusun.
          </p>
        </div>
        {jmlEdit > 0 && (
          <div className="edit-actions">
            <span className="tag tag-warn">{jmlEdit} sel disunting</span>
            <button type="button" className="btn-x" onClick={onResetSheet}>
              Batalkan semua di sheet ini
            </button>
          </div>
        )}
      </div>

      <div className="table-wrap">
        <table className="xl">
          <thead>
            <tr>
              {OUT_HEADERS.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((r, i) => {
              const baris = 14 + i
              return (
                <tr key={r.no} className={r.tmtKosong ? 'is-warn' : ''}>
                  <td className="c-no">{r.no}</td>
                  {KOLOM_EDIT.map(({ c }) => {
                    const nilaiAwal = nilaiKolom(r, c)
                    const kunci = kunciEdit(sheet.name, baris, c)
                    const sudah = edit.has(kunci)
                    return (
                      <td key={c} className={`c-edit ${sudah ? 'is-edited' : ''}`}>
                        <input
                          type="text"
                          value={nilaiAwal}
                          title={nilaiAwal}
                          onChange={(e) => onEdit(kunci, e.target.value)}
                        />
                      </td>
                    )
                  })}
                  <td className="c-wahana">{r.wahana}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="hint">
        Kolom WAHANA yang terakhir mengikuti WAHANA di sebelah kiri dan tidak perlu disunting
        terpisah.
      </p>
    </div>
  )
}

function nilaiKolom(r: SheetModel['rows'][number], c: number): string {
  switch (c) {
    case 2:
      return r.kab
    case 3:
      return r.semula
    case 4:
      return r.wahana
    case 5:
      return r.menjadi
    case 7:
      return r.periodesasi
    default:
      return ''
  }
}