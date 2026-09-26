import { LAST_COL, BASE_SHEET, OUT_HEADERS, HDR_ROW, ROW0 } from './constants'
import { cloneSheet, tulisSheet } from './cloneSheet'
import { terapkanKertasF4 } from './kertasF4'
import { lampiranFileName, sanitizeFileName, type OutputMode } from './naming'
import type { OutputGroup } from './buildModel'
import type { SheetModel } from './types'
import type { TemplateInfo } from './readTemplate'

export interface ExportInput {
  /** Isi berkas template mentah — dipakai sebagai acuan layout. */
  templateData: ArrayBuffer
  /** Nama sheet acuan di dalam template. */
  templateSheet: string
  info: TemplateInfo
  group: OutputGroup
  mode: OutputMode
}

/**
 * Bangun satu workbook berisi sheet-sheet dari satu kelompok keluaran.
 *
 * ExcelJS dimuat dinamis supaya tidak ikut menggembungkan bundel awal.
 */
export async function buildWorkbook(input: ExportInput): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')

  const tplWb = new ExcelJS.Workbook()
  await tplWb.xlsx.load(input.templateData)

  const tpl = tplWb.getWorksheet(input.templateSheet) ?? tplWb.worksheets[0]
  if (!tpl) throw new Error('Sheet acuan tidak ditemukan di dalam template')

  const out = new ExcelJS.Workbook()
  out.creator = 'Generator Lampiran SK'
  out.created = new Date()

  for (const sheet of input.group.sheets) {
    const nama = unikkan(sheet.name, out)
    const ws = cloneSheet(out, tpl, nama, 'FF' + sheet.tabColor)
    tulisSheet({
      ws,
      sheet,
      tpl,
      widths: input.info.widths,
      rowHeights: input.info.rowHeights,
    })
  }

  const buf = (await out.xlsx.writeBuffer()) as ArrayBuffer

  // Ukuran kertas F4 (215 x 330 mm) tidak tersedia sebagai ukuran bernama di
  // ExcelJS, jadi disuntikkan langsung ke XML berkas.
  return terapkanKertasF4(buf, { orientation: 'landscape', scale: 85 })
}

/** ExcelJS menolak nama sheet duplikat / terlalu panjang / berkarakter terlarang. */
function unikkan(nama: string, wb: { getWorksheet: (n: string) => unknown }): string {
  let n = sanitizeFileName(nama).slice(0, 31)
  if (!n) n = 'Sheet'
  if (!wb.getWorksheet(n)) return n
  let i = 2
  while (wb.getWorksheet(`${n.slice(0, 27)}~${i}`)) i++
  return `${n.slice(0, 27)}~${i}`
}

export function namaFileLampiran(mode: OutputMode, group: OutputGroup): string {
  return lampiranFileName(mode, group.label)
}

// --------------------------------------------------------------------- rekap QC

export interface RekapInput {
  /** Semua kelompok yang dihasilkan, untuk indeks global. */
  semuaGroup: readonly OutputGroup[]
  /** Anomali, dipakai apa adanya. */
  anomalies: readonly import('./types').Anomaly[]
  /** Bila diisi, indeks dibatasi pada kelompok ini saja. */
  group?: OutputGroup
  judul: string
}

const BORDER_TIPIS = {
  top: { style: 'thin' as const, color: { argb: 'FF000000' } },
  left: { style: 'thin' as const, color: { argb: 'FF000000' } },
  bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
  right: { style: 'thin' as const, color: { argb: 'FF000000' } },
}

/**
 * Bangun workbook rekap: indeks lampiran + daftar hal yang perlu dicek.
 * Bentuknya mengikuti `Rekap & Catatan Lampiran SK.xlsx` dari pipeline Python.
 */
export async function buildRekap(input: RekapInput): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import('exceljs')
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Generator Lampiran SK'

  // ---------- sheet 1: Daftar Lampiran
  const ws1 = wb.addWorksheet('Daftar Lampiran')
  tulisTabel(
    ws1,
    ['LAMPIRAN', 'NAMA SHEET', 'ANGKATAN', 'TAHUN', 'PROVINSI', 'PROGRAM', 'BULAN', 'JML BARIS'],
    input.semuaGroup.flatMap((g) =>
      g.sheets.map((s) => [
        `LAMPIRAN ${toRomanSafe(s.lampiran)}`,
        s.name,
        s.key.angkatan,
        s.key.tahun,
        s.key.prov,
        s.key.program,
        s.key.bulan,
        s.rows.length,
      ])
    ),
    [14, 30, 10, 8, 30, 9, 8, 11]
  )

  // ---------- sheet 2: Perlu Dicek
  const ws2 = wb.addWorksheet('Perlu Dicek')
  tulisTabel(
    ws2,
    ['NAMA SHEET', 'NO', 'JENIS', 'LOKASI', 'PERIODESASI', 'CATATAN'],
    input.anomalies.map((a) => [
      a.sheet,
      a.no ?? '',
      a.kind,
      a.lokasi,
      a.periodesasi,
      a.catatan,
    ]),
    [30, 5, 28, 42, 22, 54],
    'Daftar ini dihitung otomatis. Sebagian memang konsekuensi pilihan aturan ' +
      '(misalnya bulan sheet diambil dari nama berkas).'
  )

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}

function toRomanSafe(n: number): string {
  const vals: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let r = Math.trunc(n)
  for (const [v, s] of vals) {
    while (r >= v) {
      out += s
      r -= v
    }
  }
  return out
}

function tulisTabel(
  ws: import('exceljs').Worksheet,
  headers: string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
  widths: number[],
  note?: string
): void {
  let start = 1
  if (note) {
    const c = ws.getCell(1, 1)
    c.value = note
    c.font = { italic: true, color: { argb: 'FFC00000' } }
    c.alignment = { vertical: 'middle', wrapText: true }
    ws.mergeCells(1, 1, 1, headers.length)
    ws.getRow(1).height = 30
    start = 3
  }

  headers.forEach((h, i) => {
    const c = ws.getCell(start, i + 1)
    c.value = h
    c.font = { bold: true }
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } }
    c.border = BORDER_TIPIS
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  })

  rows.forEach((r, j) => {
    r.forEach((v, i) => {
      const c = ws.getCell(start + 1 + j, i + 1)
      c.value = v
      c.border = BORDER_TIPIS
      c.alignment = { vertical: 'top', wrapText: true }
    })
  })

  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  ws.views = [{ state: 'frozen', ySplit: start }]
  if (rows.length > 0) {
    ws.autoFilter = {
      from: { row: start, column: 1 },
      to: { row: start + rows.length, column: headers.length },
    }
  }
}

// Re-export supaya pemanggil tidak perlu tahu detail konstanta.
export { LAST_COL, OUT_HEADERS, HDR_ROW, ROW0, BASE_SHEET }
export type { SheetModel }