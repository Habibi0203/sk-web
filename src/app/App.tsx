import { useState } from 'react'
import { STEPS, type StepId } from './steps'

export function App() {
  const [step, setStep] = useState<StepId>('unggah')
  const active = STEPS.find((s) => s.id === step)!

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <div>
            <h1>Generator Lampiran SK</h1>
            <p>Penggantian Pendamping PIDI &amp; PIDGI</p>
          </div>
        </div>
        <span className="badge-offline" title="Tidak ada berkas yang dikirim ke server">
          Diproses di perangkat ini
        </span>
      </header>

      <nav className="stepper" aria-label="Langkah pengerjaan">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className={`step ${s.id === step ? 'is-active' : ''}`}
            aria-current={s.id === step ? 'step' : undefined}
            onClick={() => setStep(s.id)}
          >
            <span className="step-no">{i + 1}</span>
            <span className="step-label">{s.label}</span>
          </button>
        ))}
      </nav>

      <main className="panel">
        <div className="panel-head">
          <h2>{active.label}</h2>
          <p>{active.hint}</p>
        </div>
        <div className="panel-body">
          <Placeholder step={active.id} />
        </div>
      </main>

      <footer className="foot">
        Seluruh berkas diproses di dalam browser. Tidak ada data yang dikirim ke server.
      </footer>
    </div>
  )
}

function Placeholder({ step }: { step: StepId }) {
  const note: Record<StepId, string> = {
    unggah: 'Belum ada berkas. Panel unggah akan dipasang pada fase berikutnya.',
    pratinjau: 'Pratinjau per sheet akan tampil setelah berkas diproses.',
    validasi: 'Daftar anomali akan dihitung dari data yang diproses.',
    edit: 'Sel yang bisa diedit akan tersedia setelah pratinjau siap.',
    unduh: 'Berkas Excel siap diunduh setelah data diproses.',
  }
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true" />
      <p>{note[step]}</p>
    </div>
  )
}
