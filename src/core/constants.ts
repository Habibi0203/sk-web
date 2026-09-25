/**
 * Konstanta pipeline — port 1:1 dari build_sk.py.
 * Jangan ubah urutan PROV_ORDER: itu menentukan urutan sheet.
 */

/** [nama resmi, singkatan] — urutan sesuai catatan singkatan. */
export const PROV_ORDER: ReadonlyArray<readonly [string, string]> = [
  ['ACEH', 'Aceh'],
  ['SUMATERA UTARA', 'Sumut'],
  ['SUMATERA BARAT', 'Sumbar'],
  ['RIAU', 'Riau'],
  ['KEPULAUAN RIAU', 'Kepri'],
  ['JAMBI', 'Jambi'],
  ['BENGKULU', 'Bengkulu'],
  ['SUMATERA SELATAN', 'Sumsel'],
  ['KEPULAUAN BANGKA BELITUNG', 'Babel'],
  ['LAMPUNG', 'Lampung'],
  ['DKI JAKARTA', 'DKI'],
  ['JAWA BARAT', 'Jabar'],
  ['BANTEN', 'Banten'],
  ['JAWA TENGAH', 'Jateng'],
  ['DI YOGYAKARTA', 'DIY'],
  ['JAWA TIMUR', 'Jatim'],
  ['BALI', 'Bali'],
  ['NUSA TENGGARA BARAT', 'NTB'],
  ['NUSA TENGGARA TIMUR', 'NTT'],
  ['KALIMANTAN BARAT', 'Kalbar'],
  ['KALIMANTAN TENGAH', 'Kalteng'],
  ['KALIMANTAN SELATAN', 'Kalsel'],
  ['KALIMANTAN TIMUR', 'Kaltim'],
  ['KALIMANTAN UTARA', 'Kaltara'],
  ['SULAWESI UTARA', 'Sulut'],
  ['GORONTALO', 'Gorontalo'],
  ['SULAWESI TENGAH', 'Sulteng'],
  ['SULAWESI BARAT', 'Sulbar'],
  ['SULAWESI SELATAN', 'Sulsel'],
  ['SULAWESI TENGGARA', 'Sultra'],
  ['MALUKU', 'Maluku'],
  ['MALUKU UTARA', 'Malut'],
  ['PAPUA', 'Papua'],
  ['PAPUA BARAT', 'Pabar'],
  ['PAPUA BARAT DAYA', 'PBD'],
  ['PAPUA TENGAH', 'Pateng'],
  ['PAPUA PEGUNUNGAN', 'Papeg'],
  ['PAPUA SELATAN', 'Pasel'],
] as const

export const PROV_ABBR: Readonly<Record<string, string>> = Object.fromEntries(PROV_ORDER)
export const PROV_IDX: Readonly<Record<string, number>> = Object.fromEntries(
  PROV_ORDER.map(([full], i) => [full, i])
)

/** Variasi penulisan provinsi di data mentah -> nama resmi. */
export const PROV_ALIAS: Readonly<Record<string, string>> = {
  DIY: 'DI YOGYAKARTA',
  'DAERAH ISTIMEWA YOGYAKARTA': 'DI YOGYAKARTA',
  YOGYAKARTA: 'DI YOGYAKARTA',
  NTT: 'NUSA TENGGARA TIMUR',
  NTB: 'NUSA TENGGARA BARAT',
  'KALIMANTAN TMUR': 'KALIMANTAN TIMUR',
  'KALIMANTAN TIMUR ': 'KALIMANTAN TIMUR',
  'KEP. BANGKA BELITUNG': 'KEPULAUAN BANGKA BELITUNG',
  DKI: 'DKI JAKARTA',
  'DKI JAKARTA': 'DKI JAKARTA',
  JAKARTA: 'DKI JAKARTA',
}

export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const

export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
] as const

/** Nama bulan (lowercase) -> nomor bulan 1..12. */
export const MONTH_KEY: Readonly<Record<string, number>> = Object.fromEntries(
  MONTHS_ID.map((m, i) => [m.toLowerCase(), i + 1])
)

/**
 * Ejaan salah / singkatan yang muncul di data mentah.
 *
 * CATATAN PARITAS: daftar ini adalah superset dari TYPO di build_sk.py.
 * Python hanya mengenali peb/okt/des/agst/agt, sehingga "1 Mar 2026" akan GAGAL
 * diparse di sana. Untuk aplikasi yang diisi manusia, singkatan lain ikut
 * ditoleransi supaya tidak ada TMT yang diam-diam kosong. Dataset asli tidak
 * memakai singkatan ini, jadi hasil pada data nyata tetap identik dengan Python.
 */
export const TYPO: Readonly<Record<string, number>> = {
  janauri: 1,
  februari: 2,
  februati: 2,
  pebruari: 2,
  januari: 1,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
  // singkatan
  jan: 1,
  feb: 2,
  peb: 2,
  mar: 3,
  apr: 4,
  jun: 6,
  jul: 7,
  agu: 8,
  ags: 8,
  agst: 8,
  agt: 8,
  sep: 9,
  okt: 10,
  nov: 11,
  des: 12,
}

/** Angka -> angka Romawi. Dipakai untuk nama sheet dan teks E1/E8. */
export const ROMAN_TO_NUM: Readonly<Record<string, number>> = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
}

/** Warna tab per angkatan. */
export const ANGKATAN_COLOR: Readonly<Record<number, string>> = {
  1: 'C00000', // merah
  2: '00B050', // hijau
  3: '0070C0', // biru
  4: '7030A0', // ungu
  5: 'FFC000', // kuning emas
  6: '00B0F0', // cyan
  7: 'E36C0A', // oranye
  8: '808080', // abu
}

/** Layout sheet — dari template "ANGKATAN I 2025 SUMUT FEB". */
export const BASE_SHEET = 'ANGKATAN I 2025 SUMUT FEB'
export const ROW0 = 14 // baris pertama data
export const HDR_ROW = 13 // baris header tabel
export const LAST_COL = 7 // kolom G

export const HDR_E7 = 'NOMOR HK.02.03/F.IX/       /2025 TENTANG HONORARIUM DOKTER PENDAMPING'

/**
 * Teks blok tanda tangan TIDAK di-hardcode — dibaca dari template yang diunggah.
 *
 * Alasannya dua: (1) kalau penandatangan berganti, aplikasi ikut otomatis tanpa diubah;
 * (2) nama orang tidak perlu ikut tersimpan di dalam kode sumber.
 *
 * Cara menemukannya di template: cari sel kolom E yang berisi penanda di bawah ini,
 * lalu dua sel terisi berikutnya di kolom E adalah baris kedua dan ketiga.
 */
export const SIG_ANCHOR = 'KUASA PENGGUNA ANGGARAN'

/** Jarak baris blok tanda tangan dari baris data terakhir. */
export const SIG_OFFSETS = { sig1: 2, sig2: 3, sig3: 9 } as const

/** Isi kolom output. */
export const OUT_HEADERS = [
  'NO',
  'KAB / KOTA',
  'SEMULA',
  'WAHANA',
  'MENJADI',
  'WAHANA',
  'PERIODESASI',
] as const

/** Pemetaan kolom input (1-based) di file data mentah. */
export const COLS = {
  periode: 2,
  program: 3,
  prov: 4,
  kab: 5,
  wahana: 6,
  pendamping: 7,
  pengganti: 8,
  tmt: 9,
} as const

export const FILL_TMT_KOSONG = 'FFFFFF00' // kuning, ARGB
