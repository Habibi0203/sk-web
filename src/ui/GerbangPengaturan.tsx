import { useState, type FormEvent } from 'react'
import { periksaSandi } from '../app/gerbang'

interface Props {
  onBuka: () => void
}

/**
 * Layar kunci menu Pengaturan.
 * Hanya meminta sandi; sisanya (panel apa yang tampil) diatur pemanggilnya.
 */
export function GerbangPengaturan({ onBuka }: Props) {
  const [sandi, setSandi] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (sibuk) return
    setGalat('')
    setSibuk(true)
    const cocok = await periksaSandi(sandi)
    setSibuk(false)
    if (cocok) {
      setSandi('')
      onBuka()
      return
    }
    setSandi('')
    setGalat('Sandi tidak cocok.')
  }

  return (
    <div className="gerbang">
      <form className="gerbang-kotak" onSubmit={kirim}>
        <span className="gerbang-ikon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22">
            <rect
              x="4"
              y="10"
              width="16"
              height="10"
              rx="2"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path
              d="M8 10V7.5a4 4 0 0 1 8 0V10"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </span>

        <h3>Pengaturan terkunci</h3>
        <p className="gerbang-ket">
          Menu ini mengubah template dan rekapitulasi periode. Masukkan sandi untuk membukanya.
          Berlaku selama tab ini terbuka. Langkah lain tetap bisa dipakai tanpa sandi.
        </p>

        <label className="field">
          <span>Sandi</span>
          <input
            type="password"
            value={sandi}
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setSandi(e.target.value)}
            disabled={sibuk}
          />
        </label>

        {galat && <div className="alert alert-danger gerbang-galat">{galat}</div>}

        <button type="submit" className="btn-primary" disabled={sibuk || sandi.length === 0}>
          {sibuk ? 'Memeriksa…' : 'Buka pengaturan'}
        </button>
      </form>
    </div>
  )
}
