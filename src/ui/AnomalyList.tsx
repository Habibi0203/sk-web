import { useMemo, useState } from 'react'
import type { Anomaly, AnomalyKind } from '../core/types'

interface Props {
  anomalies: readonly Anomaly[]
  onJump: (sheetName: string) => void
}

const ORDER: AnomalyKind[] = [
  'TMT kosong',
  'NAMA PENGGANTI kosong',
  'Bulan TMT beda dgn nama sheet',
  'Tanggal akhir tidak ditemukan',
  'Provinsi tidak dikenal',
  'Baris dilewati',
]

export function AnomalyList({ anomalies, onJump }: Props) {
  const [filter, setFilter] = useState<AnomalyKind | 'semua'>('semua')

  const counts = useMemo(() => {
    const m = new Map<AnomalyKind, number>()
    for (const a of anomalies) m.set(a.kind, (m.get(a.kind) ?? 0) + 1)
    return m
  }, [anomalies])

  const shown = filter === 'semua' ? anomalies : anomalies.filter((a) => a.kind === filter)

  if (anomalies.length === 0) {
    return (
      <div className="ok-box">
        <strong>Tidak ada yang perlu dicek.</strong>
        <p>Semua baris punya TMT, nama pengganti terisi, dan tanggal akhir periode ditemukan.</p>
      </div>
    )
  }

  return (
    <div className="anom">
      <div className="anom-filter">
        <button
          type="button"
          className={`chip ${filter === 'semua' ? 'is-active' : ''}`}
          onClick={() => setFilter('semua')}
        >
          Semua <b>{anomalies.length}</b>
        </button>
        {ORDER.filter((k) => counts.has(k)).map((k) => (
          <button
            key={k}
            type="button"
            className={`chip ${filter === k ? 'is-active' : ''}`}
            onClick={() => setFilter(k)}
          >
            {k} <b>{counts.get(k)}</b>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="xl anom-table">
          <thead>
            <tr>
              <th>JENIS</th>
              <th>SHEET</th>
              <th className="c-no">NO</th>
              <th>LOKASI</th>
              <th>PERIODESASI</th>
              <th>CATATAN</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((a, i) => (
              <tr key={i}>
                <td>
                  <span className={`sev ${severity(a.kind)}`}>{a.kind}</span>
                </td>
                <td>
                  <button type="button" className="link" onClick={() => onJump(a.sheet)}>
                    {a.sheet}
                  </button>
                </td>
                <td className="c-no">{a.no ?? '—'}</td>
                <td>{a.lokasi}</td>
                <td className="c-per">{a.periodesasi || '—'}</td>
                <td className="c-note">{a.catatan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function severity(kind: AnomalyKind): string {
  switch (kind) {
    case 'TMT kosong':
    case 'NAMA PENGGANTI kosong':
      return 'sev-warn'
    case 'Tanggal akhir tidak ditemukan':
    case 'Provinsi tidak dikenal':
    case 'Baris dilewati':
      return 'sev-danger'
    default:
      return 'sev-info'
  }
}
