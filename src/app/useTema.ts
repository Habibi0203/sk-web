import { useCallback, useEffect, useState } from 'react'

/**
 * Tema tampilan: gelap / terang / ikut sistem.
 *
 * Pilihan disimpan di localStorage supaya tidak perlu diulang. Bila tidak ada
 * pilihan tersimpan, aplikasi mengikuti setelan sistem.
 */

export type Tema = 'gelap' | 'terang' | 'sistem'

const KUNCI = 'sk-web:tema'

function bacaTersimpan(): Tema {
  try {
    const v = localStorage.getItem(KUNCI)
    if (v === 'gelap' || v === 'terang' || v === 'sistem') return v
  } catch {
    /* localStorage bisa diblokir — abaikan */
  }
  return 'sistem'
}

function terapkan(t: Tema): void {
  const el = document.documentElement
  if (t === 'sistem') el.removeAttribute('data-tema')
  else el.setAttribute('data-tema', t)
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(() => bacaTersimpan())
  const [efektif, setEfektif] = useState<'gelap' | 'terang'>('terang')

  // Terapkan ke <html> setiap kali pilihan berubah.
  useEffect(() => {
    terapkan(tema)
    try {
      localStorage.setItem(KUNCI, tema)
    } catch {
      /* abaikan */
    }
  }, [tema])

  // Lacak tema yang benar-benar tampil, untuk label tombol.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const hitung = () => {
      const mauGelap = tema === 'gelap' || (tema === 'sistem' && mq.matches)
      setEfektif(mauGelap ? 'gelap' : 'terang')
    }
    hitung()
    mq.addEventListener('change', hitung)
    return () => mq.removeEventListener('change', hitung)
  }, [tema])

  /** Putar tema: terang -> gelap -> sistem -> terang. */
  const putar = useCallback(() => {
    setTema((t) => (t === 'terang' ? 'gelap' : t === 'gelap' ? 'sistem' : 'terang'))
  }, [])

  return { tema, efektif, setTema, putar }
}