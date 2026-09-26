import type { SheetModel } from '../core/types'

/**
 * Peta editan manual: `${namaSheet}|${baris}|${kolom}` -> nilai baru.
 *
 * Disimpan terpisah dari model supaya bisa diterapkan ulang secara
 * deterministik setiap kali berkas disusun, dan supaya editan tidak hilang
 * saat data diproses ulang.
 */
export type EditMap = Map<string, string>

export type KolomEdit = 2 | 3 | 4 | 5 | 7

export const KOLOM_EDIT: ReadonlyArray<{ c: KolomEdit; label: string }> = [
  { c: 2, label: 'KAB / KOTA' },
  { c: 3, label: 'SEMULA' },
  { c: 4, label: 'WAHANA' },
  { c: 5, label: 'MENJADI' },
  { c: 7, label: 'PERIODESASI' },
]

export function kunciEdit(namaSheet: string, baris: number, kolom: number): string {
  return `${namaSheet}|${baris}|${kolom}`
}

/** Terapkan editan ke seluruh sheet, mengembalikan model baru. */
export function terapkanEdit(sheets: readonly SheetModel[], edit: EditMap): SheetModel[] {
  if (edit.size === 0) return [...sheets]

  return sheets.map((s) => ({
    ...s,
    rows: s.rows.map((r, i) => {
      // Nomor baris di berkas (bukan indeks array)
      const baris = 14 + i
      const ambil = (c: number): string | undefined => edit.get(kunciEdit(s.name, baris, c))

      const kab = ambil(2) ?? r.kab
      const semula = ambil(3) ?? r.semula
      const wahana = ambil(4) ?? r.wahana
      const menjadi = ambil(5) ?? r.menjadi
      const periodesasi = ambil(7) ?? r.periodesasi

      // Bila PERIODESASI disunting manual, sorotan kuning dilepas — karena
      // baris itu sudah ditangani.
      const tmtKosong = ambil(7) !== undefined ? false : r.tmtKosong

      return { ...r, kab, semula, wahana, menjadi, periodesasi, tmtKosong }
    }),
  }))
}

/** Hapus seluruh editan pada satu sheet. */
export function bersihkanEdit(edit: EditMap, namaSheet: string): EditMap {
  const next = new Map(edit)
  const awalan = `${namaSheet}|`
  for (const k of next.keys()) {
    if (k.startsWith(awalan)) next.delete(k)
  }
  return next
}

export function hitungEditPerSheet(edit: EditMap): Map<string, number> {
  const m = new Map<string, number>()
  for (const k of edit.keys()) {
    const nama = k.split('|')[0]
    m.set(nama, (m.get(nama) ?? 0) + 1)
  }
  return m
}