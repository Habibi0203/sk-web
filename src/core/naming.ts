import {
  MONTHS_ID,
  MONTH_ABBR,
  PROV_ABBR,
  PROV_IDX,
} from './constants'
import { toRoman } from './text'

export type Program = 'PIDI' | 'PIDGI'

export interface SheetKey {
  angkatan: number
  tahun: number
  program: Program
  prov: string
  /** Bulan yang diambil dari nama file asal (1..12), bukan dari isi kolom TMT. */
  bulan: number
}

/**
 * Urutan sheet: angkatan -> tahun -> provinsi (urutan custom) -> bulan -> PIDI sebelum PIDGI.
 * Padanan sort_key() Python.
 */
export function sortKey(k: SheetKey): readonly number[] {
  return [
    k.angkatan,
    k.tahun,
    PROV_IDX[k.prov] ?? 99,
    k.bulan,
    k.program === 'PIDI' ? 0 : 1,
  ]
}

export function compareSheetKey(a: SheetKey, b: SheetKey): number {
  const ka = sortKey(a)
  const kb = sortKey(b)
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) return ka[i] - kb[i]
  }
  return 0
}

/** Nama sheet: `{ROMAN}_{tahun}_{SingkatanProv}_{BulanSingkat}` + " (PIDGI)". */
export function sheetName(k: SheetKey): string {
  const abbr = PROV_ABBR[k.prov] ?? titleCase(k.prov)
  const base = `${toRoman(k.angkatan)}_${k.tahun}_${abbr}_${MONTH_ABBR[k.bulan - 1]}`
  return k.program === 'PIDGI' ? `${base} (PIDGI)` : base
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ')
}

// ------------------------------------------------------------------ bulan dari nama file

const MONTH_TOKEN = new Map<string, number>()
for (let i = 0; i < 12; i++) {
  MONTH_TOKEN.set(MONTHS_ID[i].toUpperCase(), i + 1)
  MONTH_TOKEN.set(MONTH_ABBR[i].toUpperCase(), i + 1)
}
// ejaan salah yang pernah muncul
MONTH_TOKEN.set('FEBRUATI', 2)
MONTH_TOKEN.set('PEBRUARI', 2)
MONTH_TOKEN.set('JANAURI', 1)
MONTH_TOKEN.set('AGST', 8)
MONTH_TOKEN.set('AGT', 8)
MONTH_TOKEN.set('PEB', 2)

/**
 * Tebak bulan dari nama file data mentah. Mengembalikan null bila tidak yakin,
 * supaya UI bisa meminta user memilih sendiri.
 */
export function bulanDariNamaFile(fileName: string): number | null {
  const tokens = fileName
    .toUpperCase()
    .replace(/\.[a-z0-9]+$/i, '')
    .split(/[^A-Z]+/)
    .filter(Boolean)

  // Prioritas: token paling awal yang dikenali (biasanya nama bulan ada di depan).
  for (const t of tokens) {
    const m = MONTH_TOKEN.get(t)
    if (m !== undefined) return m
  }
  return null
}

// ------------------------------------------------------------------ mode output

export type OutputMode = 'penuh' | 'bulan' | 'angkatan'

export const OUTPUT_MODES: ReadonlyArray<{
  id: OutputMode
  label: string
  hint: string
}> = [
  {
    id: 'penuh',
    label: 'Rekap penuh',
    hint: 'Satu berkas berisi seluruh sheet, urut angkatan → tahun → provinsi → bulan.',
  },
  {
    id: 'bulan',
    label: 'Perbulan',
    hint: 'Satu berkas per bulan. Tiap berkas berisi beberapa angkatan.',
  },
  {
    id: 'angkatan',
    label: 'Perangkatan',
    hint: 'Satu berkas per angkatan + tahun. Tiap berkas berisi beberapa bulan.',
  },
]

/** Kunci pengelompokan untuk pemecahan berkas. */
export function modeGroupKey(mode: OutputMode, k: SheetKey): string {
  switch (mode) {
    case 'penuh':
      return 'ALL'
    case 'bulan':
      return `B${k.bulan}`
    case 'angkatan':
      return `A${k.angkatan}-${k.tahun}`
  }
}

/** Judul kelompok untuk dipakai di nama berkas dan UI. */
export function modeGroupLabel(mode: OutputMode, k: SheetKey): string {
  switch (mode) {
    case 'penuh':
      return 'Rekap Penuh'
    case 'bulan':
      return MONTHS_ID[k.bulan - 1]
    case 'angkatan':
      return `Angkatan ${toRoman(k.angkatan)} ${k.tahun}`
  }
}

export const PENUH_FILE = 'Lampiran SK Penggantian Pendamping.xlsx'
export const REKAP_GLOBAL_FILE = 'Rekap & Catatan Lampiran SK.xlsx'

export function lampiranFileName(mode: OutputMode, label: string): string {
  return mode === 'penuh' ? PENUH_FILE : `Lampiran SK - ${label}.xlsx`
}

export function rekapFileName(mode: OutputMode, label: string): string {
  return mode === 'penuh' ? REKAP_GLOBAL_FILE : `Rekap - ${label}.xlsx`
}

/** Buang karakter yang tidak boleh ada di nama berkas Windows. */
export function sanitizeFileName(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
