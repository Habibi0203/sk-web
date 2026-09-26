/** Picu unduhan berkas di browser, lalu lepaskan kembali memori objeknya. */
export function unduhBlob(data: BlobPart, namaFile: string, tipe: string): void {
  const blob = new Blob([data], { type: tipe })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = namaFile
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Beri jeda singkat supaya browser sempat memulai unduhan.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

export const TIPE_XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
export const TIPE_ZIP = 'application/zip'

/** Ukuran berkas dalam satuan yang enak dibaca. */
export function ukuran(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}