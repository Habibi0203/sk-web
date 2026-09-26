/**
 * Gerbang akses untuk menu Pengaturan.
 *
 * Ini BUKAN pengamanan sungguhan: seluruh berkas aplikasi tetap bisa dibaca
 * siapa pun yang membuka situsnya. Gunanya hanya menjaga agar menu Pengaturan —
 * yang mengubah template dan rekapitulasi periode — tidak terbuka begitu saja
 * bagi orang yang tidak berkepentingan.
 *
 * Sandi tidak disimpan sebagai teks. Yang disimpan hanya sidik jari turunan
 * PBKDF2-SHA256 (310.000 putaran), jadi sandi aslinya tidak bisa dibaca dari
 * berkas aplikasi.
 */

/** Penanda sesi: berlaku selama tab ini terbuka, hilang saat tab ditutup. */
export const KUNCI_SESI = 'sk-pengaturan-terbuka'

const GARAM_B64 = 't8xFZfYqlj0uoo0WNTBRlg=='
const SIDIK_B64 = 'xLnbdHp3cyi2bs1HG1e/Y0iUCxddjImGy6eI5wm2stg='
const PUTARAN = 310000

function dariBase64(teks: string): Uint8Array {
  const biner = atob(teks)
  const keluar = new Uint8Array(biner.length)
  for (let i = 0; i < biner.length; i += 1) keluar[i] = biner.charCodeAt(i)
  return keluar
}

/**
 * Bandingkan dua deret byte dengan waktu tetap.
 * Perbandingan biasa berhenti di byte pertama yang beda, dan selisih waktunya
 * bisa dipakai menebak isi sandi.
 */
function samaDenganWaktuTetap(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let beda = 0
  for (let i = 0; i < a.length; i += 1) beda |= a[i] ^ b[i]
  return beda === 0
}

/** Cocokkan sandi yang diketik dengan sidik jari yang tersimpan. */
export async function periksaSandi(sandi: string): Promise<boolean> {
  const bahan = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(sandi),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const kunci = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: dariBase64(GARAM_B64), iterations: PUTARAN, hash: 'SHA-256' },
    bahan,
    256,
  )
  return samaDenganWaktuTetap(new Uint8Array(kunci), dariBase64(SIDIK_B64))
}

/** Apakah gerbang sudah dibuka pada sesi tab ini. */
export function gerbangTerbuka(): boolean {
  try {
    return sessionStorage.getItem(KUNCI_SESI) === '1'
  } catch {
    // Mode privat atau storage diblokir: anggap belum terbuka.
    return false
  }
}

export function bukaGerbang(): void {
  try {
    sessionStorage.setItem(KUNCI_SESI, '1')
  } catch {
    // Tanpa storage, pembukaan hanya berlaku sampai halaman dimuat ulang.
  }
}

export function kunciGerbang(): void {
  try {
    sessionStorage.removeItem(KUNCI_SESI)
  } catch {
    /* tidak ada yang perlu dibersihkan */
  }
}
