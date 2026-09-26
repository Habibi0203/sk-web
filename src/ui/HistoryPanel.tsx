import { useCallback, useEffect, useState } from 'react'
import { daftarRiwayat, hapusRiwayat, kosongkanRiwayat, MAKS_RIWAYAT, type Riwayat } from '../storage/history'
import { ukuran } from './unduh'

export function HistoryPanel() {
  const [riwayat, setRiwayat] = useState<Riwayat[]>([])
  const [dipilih, setDipilih] = useState<number[]>([])
  const [memuat, setMemuat] = useState(true)

  const muat = useCallback(async () => {
    setMemuat(true)
    setRiwayat(await daftarRiwayat())
    setMemuat(false)
  }, [])

  useEffect(() => {
    void muat()
  }, [muat])

  async function hapus(id: number) {
    await hapusRiwayat(id)
    setDipilih((d) => d.filter((x) => x !== id))
    await muat()
  }

  async function hapusSemua() {
    await kosongkanRiwayat()
    setDipilih([])
    await muat()
  }

  function toggle(id: number) {
    setDipilih((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id].slice(-2)))
  }

  const a = riwayat.find((r) => r.id === dipilih[0])
  const b = riwayat.find((r) => r.id === dipilih[1])

  return (
    <div className="upload">
      <section className="up-block">
        <header>
          <h3>Riwayat pemrosesan</h3>
          <p>
            Menyimpan <b>ringkasan saja</b> — nama sheet, jumlah baris, dan jumlah anomali.
            Isi tabel tidak disimpan, karena memuat nama dokter. Disimpan {MAKS_RIWAYAT} terakhir,
            di browser ini saja.
          </p>
        </header>

        {memuat ? (
          <p className="hint">Memuat…</p>
        ) : riwayat.length === 0 ? (
          <div className="empty" style={{ minHeight: 160 }}>
            <div className="empty-icon" aria-hidden="true" />
            <p>Belum ada riwayat. Riwayat tercatat setiap kali data diproses.</p>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table className="xl">
                <thead>
                  <tr>
                    <th className="c-no">BANDING</th>
                    <th>WAKTU</th>
                    <th>BERKAS</th>
                    <th className="c-no">SHEET</th>
                    <th className="c-no">BARIS</th>
                    <th className="c-no">ANOMALI</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map((r) => (
                    <tr key={r.id}>
                      <td className="c-no">
                        <input
                          type="checkbox"
                          checked={dipilih.includes(r.id!)}
                          onChange={() => toggle(r.id!)}
                          aria-label="Pilih untuk dibandingkan"
                        />
                      </td>
                      <td>{r.waktu.replace('T', ' ').slice(0, 16)}</td>
                      <td className="c-note">{r.berkasMentah.join(', ')}</td>
                      <td className="c-no">{r.jumlahSheet}</td>
                      <td className="c-no">{r.jumlahBaris}</td>
                      <td className="c-no">{r.jumlahAnomali}</td>
                      <td>
                        <button type="button" className="btn-x" onClick={() => hapus(r.id!)}>
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="up-actions">
              <button type="button" className="btn-ghost" onClick={hapusSemua}>
                Hapus semua riwayat
              </button>
              <span className="hint">
                Centang dua baris untuk membandingkan. {ukuran(new Blob([JSON.stringify(riwayat)]).size)}{' '}
                dipakai.
              </span>
            </div>
          </>
        )}
      </section>

      {a && b && (
        <section className="up-block">
          <header>
            <h3>Perbandingan</h3>
            <p>
              {a.waktu.slice(0, 16)} ⟷ {b.waktu.slice(0, 16)}
            </p>
          </header>
          <div className="banding">
            <table className="xl">
              <thead>
                <tr>
                  <th>UKURAN</th>
                  <th className="c-no">A</th>
                  <th className="c-no">B</th>
                  <th className="c-no">SELISIH</th>
                </tr>
              </thead>
              <tbody>
                <BarisBanding label="Jumlah sheet" a={a.jumlahSheet} b={b.jumlahSheet} />
                <BarisBanding label="Jumlah baris" a={a.jumlahBaris} b={b.jumlahBaris} />
                <BarisBanding label="Jumlah anomali" a={a.jumlahAnomali} b={b.jumlahAnomali} />
              </tbody>
            </table>

            <h4 className="banding-sub">Anomali per jenis</h4>
            <table className="xl">
              <thead>
                <tr>
                  <th>JENIS</th>
                  <th className="c-no">A</th>
                  <th className="c-no">B</th>
                </tr>
              </thead>
              <tbody>
                {[...new Set([...Object.keys(a.anomaliPerJenis), ...Object.keys(b.anomaliPerJenis)])]
                  .sort()
                  .map((k) => (
                    <tr key={k}>
                      <td>{k}</td>
                      <td className="c-no">{a.anomaliPerJenis[k] ?? 0}</td>
                      <td className="c-no">{b.anomaliPerJenis[k] ?? 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <h4 className="banding-sub">Sheet yang hanya ada di salah satu</h4>
            {(() => {
              const na = new Set(a.sheets.map((s) => s.nama))
              const nb = new Set(b.sheets.map((s) => s.nama))
              const hanyaA = [...na].filter((x) => !nb.has(x))
              const hanyaB = [...nb].filter((x) => !na.has(x))
              if (hanyaA.length === 0 && hanyaB.length === 0) {
                return <p className="hint">Isi sheet sama.</p>
              }
              return (
                <ul className="diff-list">
                  {hanyaA.map((n) => (
                    <li key={n}>
                      <span className="tag tag-danger">hanya A</span> {n}
                    </li>
                  ))}
                  {hanyaB.map((n) => (
                    <li key={n}>
                      <span className="tag tag-info">hanya B</span> {n}
                    </li>
                  ))}
                </ul>
              )
            })()}
          </div>
        </section>
      )}
    </div>
  )
}

function BarisBanding({ label, a, b }: { label: string; a: number; b: number }) {
  const d = b - a
  return (
    <tr>
      <td>{label}</td>
      <td className="c-no">{a}</td>
      <td className="c-no">{b}</td>
      <td className="c-no">
        {d === 0 ? '—' : <span className={d > 0 ? 'naik' : 'turun'}>{d > 0 ? `+${d}` : d}</span>}
      </td>
    </tr>
  )
}