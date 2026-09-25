import { toRoman } from '../core/text'
import { HDR_E7, OUT_HEADERS, SIG_OFFSETS } from '../core/constants'
import type { SheetModel } from '../core/types'

interface Props {
  sheet: SheetModel
}

export function PreviewTable({ sheet }: Props) {
  const n = sheet.rows.length
  const last = 13 + n

  return (
    <div className="preview">
      <div className="pv-meta">
        <div className="pv-row">
          <span className="pv-k">Nama sheet</span>
          <span className="pv-v">
            <span className="tab-dot" style={{ background: `#${sheet.tabColor}` }} />
            {sheet.name}
          </span>
        </div>
        <div className="pv-row">
          <span className="pv-k">E1</span>
          <span className="pv-v">LAMPIRAN {toRoman(sheet.lampiran)}</span>
        </div>
        <div className="pv-row">
          <span className="pv-k">E7</span>
          <span className="pv-v">{HDR_E7}</span>
        </div>
        <div className="pv-row">
          <span className="pv-k">E8</span>
          <span className="pv-v">
            PROGRAM INTERNSIP DOKTER {sheet.key.program === 'PIDGI' ? 'GIGI ' : ''}INDONESIA
            ANGKATAN {toRoman(sheet.key.angkatan)} TAHUN {sheet.key.tahun}
          </span>
        </div>
        <div className="pv-row">
          <span className="pv-k">A11</span>
          <span className="pv-v">PROVINSI {sheet.key.prov}</span>
        </div>
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
            {sheet.rows.map((r) => (
              <tr key={r.no} className={r.tmtKosong ? 'is-warn' : ''}>
                <td className="c-no">{r.no}</td>
                <td>{r.kab}</td>
                <td>{r.semula}</td>
                <td>{r.wahana}</td>
                <td>{r.menjadi || <span className="empty-cell">(kosong)</span>}</td>
                <td>{r.wahana}</td>
                <td className="c-per">{r.periodesasi}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="sig-preview">
        <p className="sig-note">
          Blok tanda tangan pada baris {last + SIG_OFFSETS.sig1}, {last + SIG_OFFSETS.sig2}, dan{' '}
          {last + SIG_OFFSETS.sig3} (di-merge E:G)
        </p>
        {sheet.sig.map((t, i) => (
          <p key={i} className="sig-line">
            {t || <span className="empty-cell">(teks tanda tangan tidak ditemukan di template)</span>}
          </p>
        ))}
      </div>
    </div>
  )
}
