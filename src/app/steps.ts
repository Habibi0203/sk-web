export type StepId =
  | 'unggah'
  | 'pratinjau'
  | 'validasi'
  | 'edit'
  | 'unduh'
  | 'pengaturan'
  | 'riwayat'

export interface StepDef {
  id: StepId
  label: string
  hint: string
  /** true = bagian dari alur kerja utama; false = utilitas pendukung. */
  utama: boolean
}

export const STEPS: StepDef[] = [
  { id: 'unggah', label: 'Unggah', hint: 'Berkas data mentah per bulan', utama: true },
  {
    id: 'pratinjau',
    label: 'Pratinjau',
    hint: 'Lihat hasil per sheet sebelum diekspor',
    utama: true,
  },
  { id: 'validasi', label: 'Validasi', hint: 'Daftar hal yang perlu dicek', utama: true },
  {
    id: 'edit',
    label: 'Edit',
    hint: 'Perbaiki nilai langsung sebelum diunduh',
    utama: true,
  },
  {
    id: 'unduh',
    label: 'Unduh',
    hint: 'Susun dan simpan berkas Excel',
    utama: true,
  },
  {
    id: 'riwayat',
    label: 'Riwayat',
    hint: 'Catatan pemrosesan sebelumnya dan perbandingannya',
    utama: false,
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    hint: 'Perbarui teks tanda tangan, rekapitulasi periode, dan template',
    utama: false,
  },
]

export const LANGKAH_UTAMA = STEPS.filter((s) => s.utama)
export const LANGKAH_UTILITAS = STEPS.filter((s) => !s.utama)
