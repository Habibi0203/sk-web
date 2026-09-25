import type ExcelJS from 'exceljs'
import { BASE_SHEET, LAST_COL, SIG_ANCHOR } from './constants'
import { cellText } from './readRaw'

export interface TemplateInfo {
  /** Nama berkas template. */
  fileName: string
  /** Nama sheet yang dipakai sebagai acuan. */
  sheetName: string
  /** Lebar kolom A..G (indeks 0..6). */
  widths: number[]
  /** Tiga teks blok tanda tangan, dibaca dari template — bukan di-hardcode. */
  sig: string[]
  /** Pengaturan halaman, disalin apa adanya. */
  pageSetup: Partial<ExcelJS.PageSetup>
  /** Tinggi baris bawaan template (perlu direset saat menulis). */
  rowHeights: Record<number, number>
  /** Nomor baris terakhir yang berisi isi di template. */
  rowCount: number
}

export const DEFAULT_WIDTHS = [4.78, 19.55, 33.55, 29.78, 27.78, 30.44, 29.44]

/**
 * Baca acuan layout dari template yang diunggah.
 *
 * Teks blok tanda tangan dicari lewat penanda `KUASA PENGGUNA ANGGARAN` di kolom E,
 * lalu dua sel terisi berikutnya di kolom yang sama. Dengan begitu nama penandatangan
 * tidak perlu disimpan di dalam kode, dan otomatis ikut bila template diperbarui.
 */
export async function readTemplate(fileName: string, data: ArrayBuffer): Promise<TemplateInfo> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(data)

  const ws = wb.getWorksheet(BASE_SHEET) ?? wb.worksheets[0]
  if (!ws) throw new Error('Template tidak memiliki sheet apa pun')

  const widths: number[] = []
  for (let c = 1; c <= LAST_COL; c++) {
    const w = ws.getColumn(c).width
    widths.push(typeof w === 'number' && w > 0 ? w : DEFAULT_WIDTHS[c - 1])
  }

  const sig = findSignatureTexts(ws)

  const rowHeights: Record<number, number> = {}
  for (let r = 1; r <= ws.rowCount; r++) {
    const h = ws.getRow(r).height
    if (typeof h === 'number' && h > 0) rowHeights[r] = h
  }

  return {
    fileName,
    sheetName: ws.name,
    widths,
    sig,
    pageSetup: { ...(ws.pageSetup as Partial<ExcelJS.PageSetup>) },
    rowHeights,
    rowCount: ws.rowCount,
  }
}

/** Cari tiga teks tanda tangan di kolom E, dimulai dari penanda KUASA PENGGUNA ANGGARAN. */
function findSignatureTexts(ws: ExcelJS.Worksheet): string[] {
  const col = 5
  let anchor = -1
  for (let r = 1; r <= ws.rowCount; r++) {
    if (cellText(ws.getCell(r, col)) === SIG_ANCHOR) {
      anchor = r
      break
    }
  }
  if (anchor < 0) return []

  const out: string[] = []
  for (let r = anchor; r <= ws.rowCount && out.length < 3; r++) {
    const t = cellText(ws.getCell(r, col))
    if (t) out.push(t)
  }
  return out
}
