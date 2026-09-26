import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { cloneSheet, tulisSheet } from '../src/core/cloneSheet'
import { readTemplate } from '../src/core/readTemplate'
import { buildModel, splitSheets } from '../src/core/buildModel'
import { parseEndDates } from '../src/core/dates'
import { readRawFiles } from '../src/core/readRaw'
import { buildWorkbook, buildRekap } from '../src/core/exportXlsx'
import type { SheetModel } from '../src/core/types'

// Semua data SINTETIS.

function ab(u8: unknown): ArrayBuffer {
  if (u8 instanceof ArrayBuffer) return u8
  const v = u8 as Uint8Array
  return v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) as ArrayBuffer
}

const HDR = ['NO', 'PERIODE', 'PROGRAM', 'PROVINSI', 'KABUPATEN/KOTA', 'WAHANA', 'NAMA PENDAMPING', 'NAMA PENGGANTI', 'TANGGAL TMT']

/** Template sintetis yang meniru struktur Template.xlsx asli. */
async function makeTemplate(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('ANGKATAN I 2025 SUMUT FEB')
  const W = [4.78, 19.55, 33.55, 29.78, 27.78, 30.44, 29.44]
  W.forEach((w, i) => {
    ws.getColumn(i + 1).width = w
  })

  const font = { name: 'Bookman Old Style', size: 10 }
  ws.getCell('E1').value = 'LAMPIRAN II'
  ws.getCell('E1').font = { ...font, bold: true }
  ws.getCell('E7').value = 'NOMOR HK.02.03/F.IX/232/2025 TENTANG HONORARIUM DOKTER PENDAMPING'
  ws.getCell('E7').font = font
  ws.getCell('E8').value = 'PROGRAM INTERNSIP DOKTER INDONESIA ANGKATAN I TAHUN 2025'
  ws.getCell('E8').font = font
  ws.getCell('A11').value = 'PROVINSI SUMATERA UTARA'
  ws.getCell('A11').font = font

  HDR.forEach((h, i) => {
    const c = ws.getCell(13, i + 1)
    c.value = h
    c.font = { ...font, bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  for (let r = 14; r <= 16; r++) {
    ws.getRow(r).height = 24
    for (let c = 1; c <= 7; c++) {
      const cell = ws.getCell(r, c)
      cell.value = `contoh ${c}`
      cell.font = font
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' },
      }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
  }

  ws.getCell(19, 5).value = 'KUASA PENGGUNA ANGGARAN'
  ws.getCell(20, 5).value = 'KANTOR PUSAT DIREKTORAT JENDERAL SUMBER DAYA MANUSIA KESEHATAN,'
  ws.getCell(26, 5).value = 'dr. Contoh Penandatangan, MARS.'
  ;[19, 20, 26].forEach((r) => {
    const c = ws.getCell(r, 5)
    c.font = font
    c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true }
  })

  ws.pageSetup = { orientation: 'landscape', paperSize: 258 as ExcelJS.PaperSize, scale: 85 }
  ws.pageSetup.printArea = 'A1:G27'

  return ab(await wb.xlsx.writeBuffer())
}

async function makeRaw(): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  const rows = [
    { prov: 'SUMATERA UTARA', tmt: '1 Maret 2026' },
    { prov: 'SUMATERA UTARA', tmt: undefined },
    { prov: 'RIAU', tmt: '1 Januari 2026' },
  ]
  const ws = wb.addWorksheet('MARET')
  HDR.forEach((h, i) => {
    ws.getCell(3, i + 1).value = h
  })
  rows.forEach((r, j) => {
    const rn = 4 + j
    ws.getCell(rn, 1).value = j + 1
    ws.getCell(rn, 2).value = 'ANGKATAN 1 TAHUN 2026'
    ws.getCell(rn, 3).value = 'PIDI'
    ws.getCell(rn, 4).value = r.prov
    ws.getCell(rn, 5).value = 'KOTA CONTOH'
    ws.getCell(rn, 6).value = 'RS Contoh'
    ws.getCell(rn, 7).value = 'dr. Andi Pratama'
    ws.getCell(rn, 8).value = 'dr. Budi Santoso'
    if (r.tmt) ws.getCell(rn, 9).value = r.tmt
  })
  return ab(await wb.xlsx.writeBuffer())
}

const PARAS = ['Angkatan I - 2026', 'PIDI', 'PIDI - SUMATERA UTARA - 26 November 2026']

async function siapkan() {
  const templateData = await makeTemplate()
  const info = await readTemplate('Template.xlsx', templateData)
  const { rows, skipped } = await readRawFiles([
    { name: 'MARET_DATA.xlsx', data: await makeRaw() },
  ])
  const model = buildModel({
    rows,
    endDates: parseEndDates(PARAS),
    sumberPeriode: 'uji',
    skipped,
    templateName: 'Template.xlsx',
    templateSig: info.sig,
  })
  return { templateData, info, model }
}

describe('cloneSheet', () => {
  it('menyalin lebar kolom, page setup, dan style sel', async () => {
    const templateData = await makeTemplate()
    const { default: E } = await import('exceljs')
    const wb = new E.Workbook()
    await wb.xlsx.load(templateData)
    const tpl = wb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const ws = cloneSheet(out, tpl, 'UJI', 'FFC00000')

    expect(ws.getColumn(3).width).toBeCloseTo(33.55, 2)
    expect(ws.pageSetup.orientation).toBe('landscape')
    expect(ws.pageSetup.paperSize).toBe(258)
    expect(ws.getCell(13, 1).value).toBe('NO')
    expect(ws.getCell(13, 1).font?.bold).toBe(true)
    expect(ws.getCell(14, 1).border?.top?.style).toBe('thin')
    expect((ws.properties.tabColor as { argb?: string })?.argb).toBe('FFC00000')
  })

  it('style tidak menular antar sheet (cloning benar-benar menyalin)', async () => {
    const templateData = await makeTemplate()
    const { default: E } = await import('exceljs')
    const wb = new E.Workbook()
    await wb.xlsx.load(templateData)
    const tpl = wb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const a = cloneSheet(out, tpl, 'A', 'FFC00000')
    const b = cloneSheet(out, tpl, 'B', 'FF00B050')

    a.getCell(13, 1).font = { bold: false, name: 'Arial', size: 20 }
    expect(tpl.getCell(13, 1).font?.name).toBe('Bookman Old Style')
    expect(b.getCell(13, 1).font?.name).toBe('Bookman Old Style')
    expect(b.getCell(13, 1).font?.bold).toBe(true)
  })
})

describe('tulisSheet', () => {
  it('menulis header, data, dan blok tanda tangan', async () => {
    const { templateData, info, model } = await siapkan()
    const { default: E } = await import('exceljs')
    const tplWb = new E.Workbook()
    await tplWb.xlsx.load(templateData)
    const tpl = tplWb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const ws = cloneSheet(out, tpl, 'UJI', 'FF00B050')
    tulisSheet({ ws, sheet: model.sheets[0], tpl, widths: info.widths, rowHeights: info.rowHeights })

    // header
    expect(ws.getCell('E1').value).toBe('LAMPIRAN I')
    expect(String(ws.getCell('E7').value)).toContain('NOMOR HK.02.03/F.IX/')
    expect(String(ws.getCell('E7').value)).toContain('       /2025')
    expect(ws.getCell('E8').value).toBe(
      'PROGRAM INTERNSIP DOKTER INDONESIA ANGKATAN I TAHUN 2026'
    )
    expect(ws.getCell('A11').value).toBe('PROVINSI SUMATERA UTARA')

    // data mulai baris 14
    expect(ws.getCell(14, 1).value).toBe(1)
    expect(ws.getCell(14, 2).value).toBe('KOTA CONTOH')
    expect(ws.getCell(14, 6).value).toBe('RS Contoh') // kolom F teks, bukan rumus
    expect(ws.getCell(14, 7).value).toBe('1 Mar 26 - 26 Nov 26')

    // TMT kosong -> "X - ..." + latar kuning
    expect(ws.getCell(15, 7).value).toBe('X - 26 Nov 26')
    expect((ws.getCell(15, 7).fill as ExcelJS.FillPattern | undefined)?.fgColor?.argb).toBe('FFFFFF00')

    // sisa baris contoh template sudah hilang
    expect(ws.getCell(16, 1).value).toBe(null)

    // BARIS DATA HARUS PUNYA BORDER — diambil dari baris contoh template.
    // Bug nyata: border ini sempat hilang karena gaya disalin dari baris contoh
    // yang sudah dibersihkan lebih dulu.
    for (const c of [1, 2, 3, 4, 5, 6, 7]) {
      const b = ws.getCell(14, c).border
      expect(b?.top?.style, `border atas kolom ${c}`).toBe('thin')
      expect(b?.bottom?.style, `border bawah kolom ${c}`).toBe('thin')
      expect(b?.left?.style, `border kiri kolom ${c}`).toBe('thin')
      expect(b?.right?.style, `border kanan kolom ${c}`).toBe('thin')
    }

    // merge yang diharapkan
    const merges = ws.model.merges ?? []
    expect(merges).toContain('E7:G7')
    expect(merges).toContain('E8:G8')
  })

  it('baris tanda tangan TIDAK berborder, dan kolom A-D-nya bersih', async () => {
    const { templateData, info, model } = await siapkan()
    const { default: E } = await import('exceljs')
    const tplWb = new E.Workbook()
    await tplWb.xlsx.load(templateData)
    const tpl = tplWb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const ws = cloneSheet(out, tpl, 'UJI', 'FF00B050')
    const sheet = model.sheets[0]
    tulisSheet({ ws, sheet, tpl, widths: info.widths, rowHeights: info.rowHeights })

    const last = 13 + sheet.rows.length
    for (const r of [last + 2, last + 3, last + 9]) {
      // kolom A-D dibersihkan
      for (const c of [1, 2, 3, 4]) {
        expect(ws.getCell(r, c).border?.top?.style, `A-D baris ${r} kolom ${c}`).toBeFalsy()
      }
    }
  })

  it('menempatkan tanda tangan sesuai jumlah baris dan meng-merge E:G', async () => {
    const { templateData, info, model } = await siapkan()
    const { default: E } = await import('exceljs')
    const tplWb = new E.Workbook()
    await tplWb.xlsx.load(templateData)
    const tpl = tplWb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const ws = cloneSheet(out, tpl, 'UJI', 'FF00B050')
    const sheet: SheetModel = model.sheets[0]
    tulisSheet({ ws, sheet, tpl, widths: info.widths, rowHeights: info.rowHeights })

    const n = sheet.rows.length
    const last = 13 + n
    const merges = ws.model.merges ?? []

    expect(ws.getCell(last + 2, 5).value).toBe('KUASA PENGGUNA ANGGARAN')
    expect(ws.getCell(last + 3, 5).value).toContain('KANTOR PUSAT')
    expect(ws.getCell(last + 9, 5).value).toBe('dr. Contoh Penandatangan, MARS.')
    expect(merges).toContain(`E${last + 2}:G${last + 2}`)
    expect(merges).toContain(`E${last + 3}:G${last + 3}`)
    expect(merges).toContain(`E${last + 9}:G${last + 9}`)

    // border A-D baris tanda tangan dibersihkan
    expect(ws.getCell(last + 2, 1).border?.top?.style).toBeFalsy()
  })

  it('menyetel tinggi baris otomatis, bukan angka tetap', async () => {
    const { templateData, info, model } = await siapkan()
    const { default: E } = await import('exceljs')
    const tplWb = new E.Workbook()
    await tplWb.xlsx.load(templateData)
    const tpl = tplWb.getWorksheet('ANGKATAN I 2025 SUMUT FEB')!

    const out = new E.Workbook()
    const ws = cloneSheet(out, tpl, 'UJI', 'FF00B050')
    tulisSheet({ ws, sheet: model.sheets[0], tpl, widths: info.widths, rowHeights: info.rowHeights })

    // baris data: nilainya harus hasil hitungan, bukan 45
    const h14 = ws.getRow(14).height
    expect(h14).toBeDefined()
    expect(h14).not.toBe(45)
    expect(h14).toBeGreaterThan(0)

    // tinggi warisan template (24) sudah tidak ada
    expect(ws.getRow(15).height).not.toBe(24)
  })
})

describe('buildWorkbook + buildRekap', () => {
  it('menghasilkan berkas Excel yang bisa dibaca kembali', async () => {
    const { templateData, info, model } = await siapkan()
    const groups = splitSheets(model.sheets, 'penuh')
    const buf = await buildWorkbook({
      templateData,
      templateSheet: info.sheetName,
      info,
      group: groups[0],
      mode: 'penuh',
    })

    expect(buf.byteLength).toBeGreaterThan(2000)

    const { default: E } = await import('exceljs')
    const wb = new E.Workbook()
    await wb.xlsx.load(buf)
    expect(wb.worksheets).toHaveLength(model.sheets.length)
    const ws = wb.worksheets[0]
    expect(ws.getCell('E1').value).toBe('LAMPIRAN I')
    expect(ws.getCell(14, 7).value).toBe('1 Mar 26 - 26 Nov 26')
  })

  it('memecah berkas per bulan dan mengulang nomor LAMPIRAN', async () => {
    const { templateData, info, model } = await siapkan()
    const groups = splitSheets(model.sheets, 'bulan')
    const buf = await buildWorkbook({
      templateData,
      templateSheet: info.sheetName,
      info,
      group: groups[0],
      mode: 'bulan',
    })
    const { default: E } = await import('exceljs')
    const wb = new E.Workbook()
    await wb.xlsx.load(buf)
    expect(wb.worksheets[0].getCell('E1').value).toBe('LAMPIRAN I')
  })

  it('membangun workbook rekap dengan dua sheet', async () => {
    const { model } = await siapkan()
    const groups = splitSheets(model.sheets, 'penuh')
    const buf = await buildRekap({
      semuaGroup: groups,
      anomalies: model.anomalies,
      judul: 'uji',
    })

    const { default: E } = await import('exceljs')
    const wb = new E.Workbook()
    await wb.xlsx.load(buf)
    const namaSheet = wb.worksheets.map((w) => w.name)
    expect(namaSheet).toContain('Daftar Lampiran')
    expect(namaSheet).toContain('Perlu Dicek')

    const ws2 = wb.getWorksheet('Perlu Dicek')!
    // ada catatan di baris 1, header di baris 3
    expect(String(ws2.getCell(1, 1).value)).toContain('dihitung otomatis')
    expect(ws2.getCell(3, 1).value).toBe('NAMA SHEET')

    const jenis = new Set<string>()
    for (let r = 4; r <= 4 + model.anomalies.length; r++) {
      const v = ws2.getCell(r, 3).value
      if (v) jenis.add(String(v))
    }
    expect(jenis.has('TMT kosong')).toBe(true)
  })
})