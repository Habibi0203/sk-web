export type StepId = 'unggah' | 'pratinjau' | 'validasi' | 'edit' | 'unduh'

export interface StepDef {
  id: StepId
  label: string
  hint: string
}

export const STEPS: StepDef[] = [
  { id: 'unggah', label: 'Unggah', hint: 'File data mentah, template, dan rekapitulasi periode' },
  { id: 'pratinjau', label: 'Pratinjau', hint: 'Lihat hasil per sheet sebelum diekspor' },
  { id: 'validasi', label: 'Validasi', hint: 'Daftar hal yang perlu dicek' },
  { id: 'edit', label: 'Edit', hint: 'Perbaiki nilai langsung sebelum diunduh' },
  { id: 'unduh', label: 'Unduh', hint: 'Simpan berkas Excel hasil generate' },
]
