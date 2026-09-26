import { useEffect, useState } from 'react'
import { STEPS, type StepId } from './steps'
import { usePipeline } from './usePipeline'
import { UploadPanel } from '../ui/UploadPanel'
import { SheetTabs } from '../ui/SheetTabs'
import { PreviewTable } from '../ui/PreviewTable'
import { AnomalyList } from '../ui/AnomalyList'
import { PengaturanPanel } from '../ui/PengaturanPanel'
import { ExportPanel } from '../ui/ExportPanel'
import { EditGrid } from '../ui/EditGrid'
import { HistoryPanel } from '../ui/HistoryPanel'

export function App() {
  const p = usePipeline()
  const [step, setStep] = useState<StepId>('unggah')
  const [sheetIdx, setSheetIdx] = useState(0)

  // Setelah data diproses, langsung antar ke pratinjau.
  useEffect(() => {
    if (p.model) {
      setSheetIdx(0)
      setStep('pratinjau')
    }
  }, [p.model])

  const active = STEPS.find((s) => s.id === step)!
  const adaModel = p.modelEfektif !== null

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
        {STEPS.map((s, i) => {
          const terkunci = (s.id === 'pratinjau' || s.id === 'validasi') && !adaModel
          return (
            <button
              key={s.id}
              type="button"
              className={`step ${s.id === step ? 'is-active' : ''}`}
              aria-current={s.id === step ? 'step' : undefined}
              disabled={terkunci}
              title={terkunci ? 'Proses data terlebih dahulu' : s.hint}
              onClick={() => setStep(s.id)}
            >
              <span className="step-no">{i + 1}</span>
              <span className="step-label">{s.label}</span>
            </button>
          )
        })}
      </nav>

      {p.model && (
        <div className="summary">
          <span>
            <b>{p.model.sheets.length}</b> sheet
          </span>
          <span>
            <b>{p.model.rawCount}</b> baris data
          </span>
          <span>
            <b>{p.model.anomalies.length}</b> perlu dicek
          </span>
          {p.edit.size > 0 && (
            <span className="summary-edit">
              <b>{p.edit.size}</b> sel disunting
            </span>
          )}
          <span className="summary-src">Template: {p.model.templateName}</span>
          <span className="summary-src">Periode: {p.model.sumberPeriode}</span>
        </div>
      )}

      <main className="panel">
        <div className="panel-head">
          <h2>{active.label}</h2>
          <p>{active.hint}</p>
        </div>
        <div className="panel-body">
          {step === 'unggah' && (
            <UploadPanel p={p} kePengaturan={() => setStep('pengaturan')} />
          )}

          {step === 'pratinjau' &&
            (p.modelEfektif ? (
              <div className="preview-layout">
                <SheetTabs sheets={p.modelEfektif.sheets} active={sheetIdx} onSelect={setSheetIdx} />
                {p.modelEfektif.sheets[sheetIdx] && (
                  <PreviewTable sheet={p.modelEfektif.sheets[sheetIdx]} />
                )}
              </div>
            ) : (
              <Kosong pesan="Belum ada data. Unggah berkas lalu klik Proses data." />
            ))}

          {step === 'validasi' &&
            (p.modelEfektif ? (
              <AnomalyList
                anomalies={p.modelEfektif.anomalies}
                onJump={(name) => {
                  const i = p.modelEfektif!.sheets.findIndex((s) => s.name === name)
                  if (i >= 0) {
                    setSheetIdx(i)
                    setStep('pratinjau')
                  }
                }}
              />
            ) : (
              <Kosong pesan="Daftar ini dihitung setelah data diproses." />
            ))}

          {step === 'edit' &&
            (p.modelEfektif ? (
              <div className="preview-layout">
                <SheetTabs sheets={p.modelEfektif.sheets} active={sheetIdx} onSelect={setSheetIdx} />
                {p.modelEfektif.sheets[sheetIdx] && (
                  <EditGrid
                    sheet={p.modelEfektif.sheets[sheetIdx]}
                    edit={p.edit}
                    onEdit={p.setEditSel}
                    onResetSheet={() => p.resetEditSheet(p.modelEfektif!.sheets[sheetIdx].name)}
                  />
                )}
              </div>
            ) : (
              <Kosong pesan="Edit sel tersedia setelah data diproses." />
            ))}
          {step === 'unduh' &&
            (p.modelEfektif ? (
              <ExportPanel
                model={p.modelEfektif}
                info={p.aset.template!}
                templateData={p.modelEfektif.templateData}
                templateSheet={p.aset.template?.sheetName ?? ''}
              />
            ) : (
              <Kosong pesan="Berkas bisa disusun setelah data diproses." />
            ))}
          {step === 'riwayat' && <HistoryPanel />}
          {step === 'pengaturan' && <PengaturanPanel p={p} />}
        </div>
      </main>

      <footer className="foot">
        Seluruh berkas diproses di dalam browser. Tidak ada data yang dikirim ke server.
      </footer>
    </div>
  )
}

function Kosong({ pesan }: { pesan: string }) {
  return (
    <div className="empty">
      <div className="empty-icon" aria-hidden="true" />
      <p>{pesan}</p>
    </div>
  )
}
