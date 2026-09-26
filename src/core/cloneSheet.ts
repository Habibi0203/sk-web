import type ExcelJS from 'exceljs'
import { HDR_E7, LAST_COL, ROW0, SIG_OFFSETS } from './constants'
import { autofitHeight } from './autofit'
import { toRoman } from './text'
import type { SheetModel } from './types'
import type { TemplateInfo } from './readTemplate'

/**
 * Salin isi sheet template ke sheet baru.
 *
 * ExcelJS tidak punya `copyWorksheet` (hanya `duplicateRow`), jadi penyalinan
 * dilakukan per sel. Ini bagian yang paling menentukan hasil akhir identik
 * dengan pipeline Python, karena itu setiap atribut disalin satu per satu.
 *
 * Objek style di ExcelJS dibagi lewat referensi, jadi WAJIB di-clone dalam
 * supaya perubahan di satu sheet tidak menular ke sheet lain.
 */

/** Salin nilai sel apa adanya, termasuk rumus dan rich text. */
export function cloneCellValue(v: ExcelJS.CellValue): ExcelJS.CellValue {
  if (v === null || v === undefined) return null
  if (v instanceof Date) return new Date(v.getTime())
  if (typeof v !== 'object') return v

  const o = v as unknown as Record<string, unknown>
  if ('richText' in o && Array.isArray(o.richText)) {
    return structuredClone(v)
  }
  if ('formula' in o) return { ...(o as object) } as ExcelJS.CellValue
  if ('sharedFormula' in o) return { ...(o as object) } as ExcelJS.CellValue
  if ('hyperlink' in o) return { ...(o as object) } as ExcelJS.CellValue
  if ('error' in o) return { ...(o as object) } as ExcelJS.CellValue
  return v
}

function cloneStyle(src: ExcelJS.Cell, dst: ExcelJS.Cell): void {
  if (src.font) dst.font = structuredClone(src.font)
  if (src.border) dst.border = structuredClone(src.border)
  if (src.fill) dst.fill = structuredClone(src.fill)
  if (src.alignment) dst.alignment = structuredClone(src.alignment)
  if (src.protection) dst.protection = structuredClone(src.protection)
  if (src.numFmt) dst.numFmt = src.numFmt
}

/** Buat sheet baru di `wb` yang menyalin layout sheet template. */
export function cloneSheet(
  wb: ExcelJS.Workbook,
  tpl: ExcelJS.Worksheet,
  nama: string,
  tabColorArgb: string
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(nama, {
    properties: { tabColor: { argb: tabColorArgb } },
    // `views` bisa null (bergantung versi/isi berkas), jadi perlu dijaga.
    views: (tpl.views ?? []).map((v) => structuredClone(v)),
  })

  // 1. Lebar kolom
  for (let c = 1; c <= LAST_COL; c++) {
    const w = tpl.getColumn(c).width
    if (typeof w === 'number') ws.getColumn(c).width = w
  }

  // 2. Pengaturan halaman & properti
  ws.pageSetup = structuredClone(tpl.pageSetup) as Partial<ExcelJS.PageSetup>
  ws.properties.defaultRowHeight = tpl.properties.defaultRowHeight
  ws.properties.defaultColWidth = tpl.properties.defaultColWidth

  // 3. Sel: nilai + style per atribut
  const maxRow = Math.max(tpl.rowCount, ROW0 + 2)
  for (let r = 1; r <= maxRow; r++) {
    const srcRow = tpl.getRow(r)
    const dstRow = ws.getRow(r)
    if (typeof srcRow.height === 'number') dstRow.height = srcRow.height
    for (let c = 1; c <= LAST_COL; c++) {
      const s = srcRow.getCell(c)
      const d = dstRow.getCell(c)
      d.value = cloneCellValue(s.value)
      cloneStyle(s, d)
    }
  }

  // 4. Merge bawaan template (template asli tidak punya, tapi tetap ditangani)
  for (const range of tpl.model.merges ?? []) {
    try {
      ws.mergeCells(range)
    } catch {
      /* rentang tidak valid — lewati */
    }
  }

  return ws
}

export interface TulisSheetInput {
  ws: ExcelJS.Worksheet
  sheet: SheetModel
  tpl: ExcelJS.Worksheet
  widths: number[]
  /** Tinggi baris bawaan template yang perlu direset. */
  rowHeights: Record<number, number>
}

// Catatan ExcelJS: nilai vertikal hanya menerima 'top' | 'middle' | 'bottom'.
// Di openpyxl padanannya 'center', jadi jangan tertukar.
// Helper: ExcelJS menuntut objek Alignment lengkap, padahal kita hanya perlu
// sebagian properti. Cast dikumpulkan di satu tempat ini saja.
const A = (o: Partial<ExcelJS.Alignment>): ExcelJS.Alignment => o as ExcelJS.Alignment

const ALIGN_WRAP = A({
  wrapText: true,
  vertical: 'top',
  horizontal: 'left',
})
const ALIGN_TOP = A({ vertical: 'top', horizontal: 'center' })
const ALIGN_HDR = A({ wrapText: true, vertical: 'middle', horizontal: 'left' })
const ALIGN_SIG = A({ wrapText: true, vertical: 'middle', horizontal: 'left' })

/** Kosongkan nilai, border, dan latar sebuah sel. */
function bersihkan(cell: ExcelJS.Cell): void {
  cell.value = null
  cell.border = {} as Partial<ExcelJS.Borders>
  cell.fill = { type: 'pattern', pattern: 'none' } as ExcelJS.Fill
}

/** Tulis satu sheet lengkap: header, data, blok tanda tangan, print area. */
export function tulisSheet(input: TulisSheetInput): void {
  const { ws, sheet, tpl, widths, rowHeights } = input
  const n = sheet.rows.length
  const last = ROW0 + n - 1

  // --- header
  ws.getCell('E1').value = `LAMPIRAN ${toRoman(sheet.lampiran)}`
  ws.getCell('E1').alignment = ALIGN_HDR
  ws.getCell('E7').value = HDR_E7
  ws.getCell('E7').alignment = ALIGN_HDR
  const prog = sheet.key.program === 'PIDGI' ? 'DOKTER GIGI INDONESIA' : 'DOKTER INDONESIA'
  ws.getCell('E8').value = `PROGRAM INTERNSIP ${prog} ANGKATAN ${toRoman(sheet.key.angkatan)} TAHUN ${sheet.key.tahun}`
  ws.getCell('E8').alignment = ALIGN_HDR
  ws.getCell('A11').value = `PROVINSI ${sheet.key.prov}`

  // --- bersihkan sisa baris contoh template + reset tinggi warisan
  for (let r = ROW0; r <= ws.rowCount; r++) {
    for (let c = 1; c <= LAST_COL; c++) {
      const cell = ws.getRow(r).getCell(c)
      cell.value = null
      cell.border = {} as Partial<ExcelJS.Borders>
      cell.fill = { type: 'pattern', pattern: 'none' } as ExcelJS.Fill
    }
    if (rowHeights[r] !== undefined) ws.getRow(r).height = undefined as unknown as number
  }

  // --- merge header E7/E8 sampai G (nomor SK & nama program jadi satu baris utuh)
  for (const hr of [7, 8]) {
    for (const c of [6, 7]) bersihkan(ws.getRow(hr).getCell(c))
    ws.mergeCells(hr, 5, hr, LAST_COL)
    ws.getRow(hr).height = autofitHeight(
      [null, null, null, null, ws.getCell(hr, 5).value as string, null, null],
      widths,
      [4, 6]
    )
  }

  // --- baris data, style mengikuti baris contoh template
  const GAYA_ACUAN = ROW0
  for (let j = 0; j < n; j++) {
    const r = ROW0 + j
    const it = sheet.rows[j]
    const dst = ws.getRow(r)
    const acuan = ws.getRow(GAYA_ACUAN)

    for (let c = 1; c <= LAST_COL; c++) {
      const d = dst.getCell(c)
      const s = acuan.getCell(c)
      if (s.font) d.font = structuredClone(s.font)
      if (s.border) d.border = structuredClone(s.border)
      if (s.fill) d.fill = structuredClone(s.fill)
      if (s.alignment) d.alignment = structuredClone(s.alignment)
      if (s.numFmt) d.numFmt = s.numFmt
      d.value = null
    }

    dst.getCell(1).value = it.no
    dst.getCell(1).alignment = ALIGN_TOP
    dst.getCell(2).value = it.kab
    dst.getCell(2).alignment = ALIGN_WRAP
    dst.getCell(3).value = it.semula
    dst.getCell(3).alignment = ALIGN_WRAP
    dst.getCell(4).value = it.wahana
    dst.getCell(4).alignment = ALIGN_WRAP
    dst.getCell(5).value = it.menjadi
    dst.getCell(5).alignment = ALIGN_WRAP
    // Kolom F ditulis sebagai TEKS, bukan rumus "=D{r}". Rumus tanpa nilai
    // tersimpan akan tampil kosong di aplikasi yang tidak menghitung ulang.
    dst.getCell(6).value = it.wahana
    dst.getCell(6).alignment = ALIGN_WRAP

    const g = dst.getCell(7)
    g.value = it.periodesasi
    g.alignment = ALIGN_WRAP
    if (it.tmtKosong) {
      g.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
    }

    dst.height = autofitHeight(
      [it.no, it.kab, it.semula, it.wahana, it.menjadi, it.wahana, it.periodesasi],
      widths
    )
  }

  // --- blok tanda tangan
  const sig1 = last + SIG_OFFSETS.sig1
  const sig2 = last + SIG_OFFSETS.sig2
  const sig3 = last + SIG_OFFSETS.sig3
  const sigRows = [sig1, sig2, sig3]

  // Kosongkan F & G dulu supaya border baris data tidak ikut terbawa ke sel gabungan.
  for (const r of sigRows) {
    for (const c of [6, 7]) bersihkan(ws.getRow(r).getCell(c))
  }

  // Style tanda tangan diambil dari sel template (E19 di template = baris sig1 acuan).
  const acuanTtd = [tpl.getRow(19).getCell(5), tpl.getRow(20).getCell(5), tpl.getRow(26).getCell(5)]
  sigRows.forEach((r, i) => {
    const c = ws.getRow(r).getCell(5)
    const s = acuanTtd[i]
    if (s) {
      if (s.font) c.font = structuredClone(s.font)
      if (s.border) c.border = structuredClone(s.border)
      if (s.fill) c.fill = structuredClone(s.fill)
      if (s.numFmt) c.numFmt = s.numFmt
    }
    c.value = sheet.sig[i] ?? ''
    c.alignment = ALIGN_SIG
  })

  ws.mergeCells(sig1, 5, sig1, LAST_COL)
  ws.mergeCells(sig2, 5, sig2, LAST_COL)
  ws.mergeCells(sig3, 5, sig3, LAST_COL)

  for (const r of sigRows) {
    const v = ws.getRow(r).getCell(5).value as string
    ws.getRow(r).height = autofitHeight([null, null, null, null, v, null, null], widths, [4, 6])
  }

  // Bersihkan sisa border di baris kosong. Untuk baris tanda tangan, hanya kolom
  // A-D yang dibersihkan karena E:G dipakai teks tanda tangan.
  const sigSet = new Set(sigRows)
  for (let r = last + 1; r <= ws.rowCount; r++) {
    const cols = sigSet.has(r) ? [1, 2, 3, 4] : [1, 2, 3, 4, 5, 6, 7]
    for (const c of cols) bersihkan(ws.getRow(r).getCell(c))
  }

  ws.pageSetup.printArea = `A1:G${sig3 + 2}`
}

/** Tinggi baris & lebar kolom template yang perlu diketahui saat menulis. */
export function infoTemplate(tpl: ExcelJS.Worksheet, info: TemplateInfo) {
  return { tpl, widths: info.widths, rowHeights: info.rowHeights }
}