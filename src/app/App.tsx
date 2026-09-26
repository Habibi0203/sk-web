import { useEffect, useState } from 'react'
import { stepDef, Navigasi, TopBar } from './Navigasi'
import { Ringkasan } from './Ringkasan'
import { usePipeline } from './usePipeline'
import { useTema } from './useTema'
import type { StepId } from './steps'
import { UploadPanel } from '../ui/UploadPanel'
import { SheetTabs } from '../ui/SheetTabs'
import { PreviewTable } from '../ui/PreviewTable'
import { AnomalyList } from '../ui/AnomalyList'
import { PengaturanPanel } from '../ui/PengaturanPanel'
import { GerbangPengaturan } from '../ui/GerbangPengaturan'
import { ExportPanel } from '../ui/ExportPanel'
import { EditGrid } from '../ui/EditGrid'
import { HistoryPanel } from '../ui/HistoryPanel'
import { hitungEditPerSheet } from '../storage/edits'
import { gerbangTerbuka, bukaGerbang, kunciGerbang } from './gerbang'

export function App() {
  const p = usePipeline()
  const tema = useTema()
  const [step, setStep] = useState<StepId>('unggah')
  const [sheetIdx, setSheetIdx] = useState(0)
  // Gerbang Pengaturan: berlaku selama tab terbuka, bukan tiap navigasi.
  const [pengaturanTerbuka, setPengaturanTerbuka] = useState<boolean>(() => gerbangTerbuka())

  // Setelah data diproses, langsung antar ke pratinjau.
  useEffect(() => {
    if (p.model) {
      setSheetIdx(0)
      setStep('pratinjau')
    }
  }, [p.model])

  const aktif = stepDef(step)
  const adaData = p.modelEfektif !== null
  const editPerSheet = hitungEditPerSheet(p.edit)

  // Jaga indeks sheet tetap masuk akal bila daftar berubah.
  useEffect(() => {
    const n = p.modelEfektif?.sheets.length ?? 0
    if (sheetIdx >= n && n > 0) setSheetIdx(0)
  }, [p.modelEfektif, sheetIdx])

  return (
    <div className="app">
      <TopBar tema={tema.tema} onPutarTema={tema.putar} efektif={tema.efektif} />

      <Navigasi step={step} onPilih={setStep} adaData={adaData} />

      {p.model && adaData && (
        <Ringkasan
          model={{ ...p.modelEfektif! }}
          jumlahSheet={p.modelEfektif!.sheets.length}
          jumlahEdit={p.edit.size}
        />
      )}

      <main className="panel">
        <div className="panel-head">
          <div>
            <h2>{aktif.label}</h2>
            <p>{aktif.hint}</p>
          </div>
          {!adaData && step !== 'unggah' && step !== 'pengaturan' && step !== 'riwayat' && (
            <span className="panel-kunci">Perlu proses data dulu</span>
          )}
          {step === 'pengaturan' && pengaturanTerbuka && (
            <button
              type="button"
              className="btn-ghost btn-kecil"
              onClick={() => {
                kunciGerbang()
                setPengaturanTerbuka(false)
                setStep('unggah')
              }}
            >
              Kunci lagi
            </button>
          )}
        </div>

        <div className="panel-body">
          {step === 'unggah' && <UploadPanel p={p} kePengaturan={() => setStep('pengaturan')} />}

          {step === 'pratinjau' &&
            (p.modelEfektif ? (
              <div className="layout-sheet">
                <SheetTabs
                  sheets={p.modelEfektif.sheets}
                  active={sheetIdx}
                  onSelect={setSheetIdx}
                  editPerSheet={editPerSheet}
                />
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
              <div className="layout-sheet">
                <SheetTabs
                  sheets={p.modelEfektif.sheets}
                  active={sheetIdx}
                  onSelect={setSheetIdx}
                  editPerSheet={editPerSheet}
                />
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
          {step === 'pengaturan' &&
            (pengaturanTerbuka ? (
              <PengaturanPanel p={p} />
            ) : (
              <GerbangPengaturan
                onBuka={() => {
                  bukaGerbang()
                  setPengaturanTerbuka(true)
                }}
              />
            ))}
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