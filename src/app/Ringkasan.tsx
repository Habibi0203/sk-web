import type { BuildModel } from '../core/types'

interface Props {
  model: BuildModel
  jumlahSheet: number
  jumlahEdit: number
}

/** Kartu ringkasan hasil pemrosesan — angka penting sekilas. */
export function Ringkasan({ model, jumlahSheet, jumlahEdit }: Props) {
  const baris = model.sheets.reduce((a, s) => a + s.rows.length, 0)
  const anomali = model.anomalies.length
  const tmtKosong = model.anomalies.filter((a) => a.kind === 'TMT kosong').length

  return (
    <div className="ringkasan">
      <Kartu angka={jumlahSheet} label="Sheet" />
      <Kartu angka={baris} label="Baris data" />
      <Kartu
        angka={anomali}
        label="Perlu dicek"
        nada={anomali > 0 ? 'warn' : 'ok'}
      />
      {jumlahEdit > 0 && <Kartu angka={jumlahEdit} label="Sel disunting" nada="warn" />}
      {tmtKosong > 0 && <Kartu angka={tmtKosong} label="TMT kosong" nada="warn" />}

      <div className="ringkasan-sumber">
        <span>
          <b>Template</b> {model.templateName}
        </span>
        <span>
          <b>Periode</b> {model.sumberPeriode}
        </span>
      </div>
    </div>
  )
}

function Kartu({
  angka,
  label,
  nada,
}: {
  angka: number
  label: string
  nada?: 'warn' | 'ok'
}) {
  return (
    <div className={`kartu ${nada ? `kartu-${nada}` : ''}`}>
      <span className="kartu-angka">{angka}</span>
      <span className="kartu-label">{label}</span>
    </div>
  )
}