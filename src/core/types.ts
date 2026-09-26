import type { Tmt } from './dates'
import type { SheetKey, Program } from './naming'

export type { Program }

/** Satu baris data mentah yang sudah dinormalisasi. */
export interface RawRow {
  /** Nama berkas asal. */
  src: string
  /** Nama sheet asal di berkas mentah. */
  sheet: string
  /** Nomor baris asal (untuk penelusuran). */
  rowno: number
  /** Bulan dari nama berkas asal (1..12). */
  bulan: number
  angkatan: number
  tahun: number
  program: Program
  prov: string
  kab: string
  wahana: string
  semula: string
  menjadi: string
  tmt: Tmt | null
  tmtRaw: string
}

/** Baris yang dilewati beserta alasannya. Tidak pernah dibuang diam-diam. */
export interface SkippedRow {
  src: string
  sheet: string
  reason: string
}

/** Satu baris pada kolom output A..G. */
export interface OutRow {
  no: number
  kab: string
  semula: string
  wahana: string
  menjadi: string
  /** Kolom G: "<TMT> - <tanggal akhir>". */
  periodesasi: string
  /** true bila TMT tidak diketahui -> sel diberi latar kuning. */
  tmtKosong: boolean
}

/** Satu sheet siap tulis. */
export interface SheetModel {
  key: SheetKey
  name: string
  tabColor: string
  /** Nomor urut sheet di dalam berkas tujuan; dipakai untuk teks LAMPIRAN di E1. */
  lampiran: number
  rows: OutRow[]
  /** Teks tanda tangan yang dibaca dari template. */
  sig: string[]
}

export type AnomalyKind =
  | 'TMT kosong'
  | 'Bulan TMT beda dgn nama sheet'
  | 'NAMA PENGGANTI kosong'
  | 'Tanggal akhir tidak ditemukan'
  | 'Provinsi tidak dikenal'
  | 'Baris dilewati'

export interface Anomaly {
  sheet: string
  no: number | null
  kind: AnomalyKind
  lokasi: string
  periodesasi: string
  catatan: string
}

/** Hasil lengkap satu kali proses. */
export interface BuildModel {
  sheets: SheetModel[]
  skipped: SkippedRow[]
  anomalies: Anomaly[]
  /** Nama berkas template yang dipakai. */
  templateName: string
  /** Asal tanggal akhir periode (berkas unggahan atau aset bawaan). */
  sumberPeriode: string
  /** Jumlah baris data mentah yang terbaca. */
  rawCount: number
  /**
   * Isi berkas template mentah, dipakai saat menyusun berkas Excel.
   * Bisa null bila pemrosesan tidak menyertakannya (mis. pratinjau saja).
   */
  templateData: ArrayBuffer | null
}
