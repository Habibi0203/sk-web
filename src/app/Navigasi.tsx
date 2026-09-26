import { STEPS, LANGKAH_UTAMA, LANGKAH_UTILITAS, type StepId } from './steps'
import type { Tema } from './useTema'

interface Props {
  tema: Tema
  onPutarTema: () => void
  efektif: 'gelap' | 'terang'
}

export function TopBar({ tema, onPutarTema, efektif }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
            <path
              d="M4 5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5V7h2.5A1.5 1.5 0 0 1 20 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <div className="brand-text">
          <h1>Generator Lampiran SK</h1>
          <p>Penggantian Pendamping PIDI &amp; PIDGI</p>
        </div>
      </div>

      <div className="topbar-actions">
        <span className="badge-offline" title="Tidak ada berkas yang dikirim ke server">
          <span className="dot-live" aria-hidden="true" />
          Diproses di perangkat ini
        </span>
        <button
          type="button"
          className="btn-icon"
          onClick={onPutarTema}
          title={
            tema === 'sistem'
              ? `Tema: ikut sistem (${efektif}). Klik untuk memilih terang.`
              : `Tema: ${tema}. Klik untuk mengganti.`
          }
          aria-label={`Ganti tema. Sekarang: ${tema}`}
        >
          {efektif === 'gelap' ? <IkonBulan /> : <IkonMatahari />}
          <span className="btn-icon-label">
            {tema === 'sistem' ? 'Sistem' : tema === 'gelap' ? 'Gelap' : 'Terang'}
          </span>
        </button>
      </div>
    </header>
  )
}

interface NavProps {
  step: StepId
  onPilih: (s: StepId) => void
  adaData: boolean
}

export function Navigasi({ step, onPilih, adaData }: NavProps) {
  const idxUtama = LANGKAH_UTAMA.findIndex((s) => s.id === step)

  return (
    <nav className="nav" aria-label="Langkah pengerjaan">
      <ol className="nav-utama">
        {LANGKAH_UTAMA.map((s, i) => {
          const terkunci = (s.id === 'pratinjau' || s.id === 'validasi' || s.id === 'edit' || s.id === 'unduh') && !adaData
          const aktif = s.id === step
          // Langkah dianggap selesai bila sudah dilewati (dan memang ada datanya).
          const selesai = adaData && idxUtama > i
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`nav-langkah ${aktif ? 'is-active' : ''} ${selesai ? 'is-done' : ''}`}
                aria-current={aktif ? 'step' : undefined}
                disabled={terkunci}
                title={terkunci ? 'Proses data terlebih dahulu' : s.hint}
                onClick={() => onPilih(s.id)}
              >
                <span className="nav-bullet" aria-hidden="true">
                  {selesai ? <IkonCentang /> : <span className="nav-angka">{i + 1}</span>}
                </span>
                <span className="nav-label">{s.label}</span>
              </button>
              {i < LANGKAH_UTAMA.length - 1 && <span className="nav-sambung" aria-hidden="true" />}
            </li>
          )
        })}
      </ol>

      <div className="nav-util">
        {LANGKAH_UTILITAS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`nav-util-btn ${s.id === step ? 'is-active' : ''}`}
            aria-current={s.id === step ? 'step' : undefined}
            title={s.hint}
            onClick={() => onPilih(s.id)}
          >
            {s.id === 'riwayat' ? <IkonJam /> : <IkonGir />}
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export function stepDef(id: StepId) {
  return STEPS.find((s) => s.id === id)!
}

function IkonCentang() {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
      <path
        d="M3 8.5 6.2 11.5 13 5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IkonMatahari() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <circle cx="10" cy="10" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.4 4.4l1.4 1.4M14.2 14.2l1.4 1.4M15.6 4.4l-1.4 1.4M5.8 14.2l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function IkonBulan() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
      <path
        d="M16 12.4A6.6 6.6 0 0 1 7.6 4 6.8 6.8 0 1 0 16 12.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IkonJam() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6v4.4l3 1.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IkonGir() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
      <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2.6v2M10 15.4v2M2.6 10h2M15.4 10h2M4.8 4.8l1.4 1.4M13.8 13.8l1.4 1.4M15.2 4.8l-1.4 1.4M6.2 13.8l-1.4 1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}