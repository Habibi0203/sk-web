import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { readRawFiles, findHeaderRow, cellText } from '../src/core/readRaw'
import { parseDocxParagraphs } from '../src/core/readDocx'
import { buildModel, splitSheets } from '../src/core/buildModel'

// Semua data di berkas ini SINTETIS. Jangan pernah menyalin nama orang atau
// data asli ke dalam kode/tes — repositori ini publik-facing.

/**
 * Ambil ArrayBuffer yang benar-benar pas (tanpa byte sisa).
 * Menerima `unknown` karena ExcelJS mengembalikan Buffer sementara JSZip
 * mengembalikan Uint8Array, dan kedua tipe itu tidak saling kompatibel di TS.
 */
function toArrayBuffer(data: unknown): ArrayBuffer {
  if (data instanceof ArrayBuffer) return data
  const u8 = data as Uint8Array
  return u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength) as ArrayBuffer
}

const HDR = ['NO', 'PERIODE', 'PROGRAM', 'PROVINSI', 'KABUPATEN/KOTA', 'WAHANA', 'NAMA PENDAMPING', 'NAMA PENGGANTI', 'TANGGAL TMT']

interface RowSpec {
  periode: string
  program: string
  prov: string
  kab: string
  wahana: string
  semula: string
  menjadi: string
  tmt?: string | Date | number
}

/** Bangun berkas xlsx sintetis. `hdrRow` meniru perbedaan format antar berkas asli. */
async function makeRawXlsx(sheets: Record<string, RowSpec[]>, hdrRow = 3): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook()
  for (const [name, rows] of Object.entries(sheets)) {
    const ws = wb.addWorksheet(name)
    HDR.forEach((h, i) => {
      ws.getCell(hdrRow, i + 1).value = h
    })
    rows.forEach((r, j) => {
      const rn = hdrRow + 1 + j
      ws.getCell(rn, 1).value = j + 1
      ws.getCell(rn, 2).value = r.periode
      ws.getCell(rn, 3).value = r.program
      ws.getCell(rn, 4).value = r.prov
      ws.getCell(rn, 5).value = r.kab
      ws.getCell(rn, 6).value = r.wahana
      ws.getCell(rn, 7).value = r.semula
      ws.getCell(rn, 8).value = r.menjadi
      if (r.tmt !== undefined) ws.getCell(rn, 9).value = r.tmt
    })
  }
  return toArrayBuffer(await wb.xlsx.writeBuffer())
}

/** Bangun berkas .docx sintetis berisi paragraf (opsional plus satu tabel). */
async function makeDocx(paragraphs: string[], withTable = false): Promise<ArrayBuffer> {
  const ps = paragraphs.map((t) => `<w:p><w:r><w:t>${t}</w:t></w:r></w:p>`).join('')
  const tbl = withTable
    ? '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>PIDI - HARUSNYA DIABAIKAN - 1 Januari 2000</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
    : ''
  const xml = `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${ps}${tbl}</w:body></w:document>`
  const zip = new JSZip()
  zip.file('word/document.xml', xml)
  return toArrayBuffer(await zip.generateAsync({ type: 'uint8array' }))
}

const ROW_A: RowSpec = {
  periode: 'ANGKATAN 2 TAHUN 2025',
  program: 'PIDI',
  prov: 'JAWA BARAT',
  kab: 'Kota Contoh',
  wahana: 'PKM Contoh Satu',
  semula: 'dr. Andi Pratama',
  menjadi: 'dr. Budi Santoso',
  tmt: '1 Maret 2026',
}

describe('readRawFiles', () => {
  it('menemukan header di baris 3 dan membaca barisnya', async () => {
    const data = await makeRawXlsx({ MARET: [ROW_A] })
    const res = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])

    expect(res.bulanTidakDiketahui).toEqual([])
    expect(res.rows).toHaveLength(1)
    const r = res.rows[0]
    expect(r.bulan).toBe(3)
    expect(r.angkatan).toBe(2)
    expect(r.tahun).toBe(2025)
    expect(r.program).toBe('PIDI')
    expect(r.prov).toBe('JAWA BARAT')
    expect(r.semula).toBe('dr. Andi Pratama')
    expect(r.tmt).toEqual([1, 3, 2026])
  })

  it('menemukan header di baris 1 (format berkas Februari)', async () => {
    const data = await makeRawXlsx({ 'AKT 2 TAHUN 2025 PIDI': [ROW_A] }, 1)
    const res = await readRawFiles([{ name: 'FEBRUARI_DATA.xlsx', data }])
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].bulan).toBe(2)
  })

  it('membaca beberapa sheet dalam satu berkas', async () => {
    const data = await makeRawXlsx(
      {
        'AKT 2 TAHUN 2025 PIDI': [ROW_A],
        'AKT 3 TAHUN 2025 PIDGI': [{ ...ROW_A, periode: 'ANGKATAN 3 TAHUN 2025', program: 'PIDGI' }],
      },
      1
    )
    const res = await readRawFiles([{ name: 'FEBRUARI_DATA.xlsx', data }])
    expect(res.rows).toHaveLength(2)
    expect(res.rows.map((r) => r.program).sort()).toEqual(['PIDGI', 'PIDI'])
  })

  it('mentoleransi ejaan provinsi & bulan yang salah', async () => {
    const data = await makeRawXlsx({
      MEI: [{ ...ROW_A, prov: 'Kalimantan Tmur', tmt: 'Janauri 2026' }],
    })
    const res = await readRawFiles([{ name: 'MEI_DATA.xlsx', data }])
    expect(res.rows[0].prov).toBe('KALIMANTAN TIMUR')
    expect(res.rows[0].tmt).toEqual([undefined, 1, 2026])
  })

  it('membiarkan TMT kosong tanpa mengarang nilai', async () => {
    const data = await makeRawXlsx({ MEI: [{ ...ROW_A, tmt: undefined }] })
    const res = await readRawFiles([{ name: 'MEI_DATA.xlsx', data }])
    expect(res.rows[0].tmt).toBeNull()
    expect(res.rows[0].tmtRaw).toBe('')
  })

  it('membaca tanggal serial Excel dengan benar', async () => {
    const data = await makeRawXlsx({ APRIL: [{ ...ROW_A, tmt: 46113 }] })
    const res = await readRawFiles([{ name: 'APRIL_DATA.xlsx', data }])
    expect(res.rows[0].tmt).toEqual([1, 4, 2026])
  })

  it('melaporkan berkas yang bulannya tidak bisa ditebak', async () => {
    const data = await makeRawXlsx({ X: [ROW_A] })
    const res = await readRawFiles([{ name: 'data penggantian.xlsx', data }])
    expect(res.bulanTidakDiketahui).toEqual(['data penggantian.xlsx'])
    expect(res.rows).toHaveLength(0)
  })

  it('mencatat sheet tanpa header, bukan membuangnya diam-diam', async () => {
    const wb = new ExcelJS.Workbook()
    wb.addWorksheet('KOSONG').getCell(1, 1).value = 'bukan header'
    const data = toArrayBuffer(await wb.xlsx.writeBuffer())
    const res = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])
    expect(res.rows).toHaveLength(0)
    expect(res.skipped).toEqual([
      { src: 'MARET_DATA.xlsx', sheet: 'KOSONG', reason: 'header tidak ditemukan' },
    ])
  })
})

describe('findHeaderRow / cellText', () => {
  it('menolak baris yang bukan header', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('S')
    ws.getCell(2, 1).value = 'NO'
    ws.getCell(2, 4).value = 'PROVINSI'
    expect(findHeaderRow(ws)).toBe(2)
  })

  it('menggabungkan rich text', async () => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('S')
    ws.getCell(1, 1).value = { richText: [{ text: 'dr. ' }, { text: 'Andi' }] }
    expect(cellText(ws.getCell(1, 1))).toBe('dr. Andi')
  })
})

describe('parseDocxParagraphs', () => {
  it('membaca paragraf berurutan dan membuang isi tabel', async () => {
    const data = await makeDocx(
      ['Angkatan II - 2025', 'PIDI', 'PIDI - ACEH - 19 Februari 2026'],
      true
    )
    const paras = await parseDocxParagraphs(data)
    expect(paras).toEqual(['Angkatan II - 2025', 'PIDI', 'PIDI - ACEH - 19 Februari 2026'])
    expect(paras.join(' ')).not.toContain('DIABAIKAN')
  })

  it('menggabungkan beberapa potongan teks dalam satu paragraf', async () => {
    const xml =
      '<?xml version="1.0"?><w:document xmlns:w="http://x"><w:body>' +
      '<w:p><w:r><w:t>PIDI - ACEH</w:t></w:r><w:r><w:t> - 19 Februari 2026</w:t></w:r></w:p>' +
      '</w:body></w:document>'
    const zip = new JSZip()
    zip.file('word/document.xml', xml)
    const data = toArrayBuffer(await zip.generateAsync({ type: 'uint8array' }))
    expect(await parseDocxParagraphs(data)).toEqual(['PIDI - ACEH - 19 Februari 2026'])
  })
})

describe('buildModel + splitSheets', () => {
  const paragraphs = ['Angkatan II - 2025', 'PIDI', 'PIDI - JAWA BARAT - 26 November 2026']

  async function model() {
    const data = await makeRawXlsx({ MARET: [ROW_A, { ...ROW_A, tmt: undefined }] })
    const { rows, skipped } = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])
    return buildModel({
      rows,
      paragraphs,
      skipped,
      templateName: 'Template.xlsx',
      templateSig: ['KUASA PENGGUNA ANGGARAN', 'KANTOR PUSAT ...', 'dr. Contoh Penandatangan'],
    })
  }

  it('menamai sheet dan mengisi PERIODESASI', async () => {
    const m = await model()
    expect(m.sheets).toHaveLength(1)
    const s = m.sheets[0]
    expect(s.name).toBe('II_2025_Jabar_Mar')
    expect(s.tabColor).toBe('00B050')
    expect(s.lampiran).toBe(1)
    expect(s.rows[0].periodesasi).toBe('1 Mar 26 - 26 Nov 26')
  })

  it('menandai TMT kosong dan memberi sorotan', async () => {
    const m = await model()
    expect(m.sheets[0].rows[1].periodesasi).toBe('X - 26 Nov 26')
    expect(m.sheets[0].rows[1].tmtKosong).toBe(true)
    expect(m.anomalies.some((a) => a.kind === 'TMT kosong')).toBe(true)
  })

  it('mendeteksi bulan TMT yang beda dari nama sheet', async () => {
    const m = await model()
    // TMT 1 Maret, sheet bulan ke-3 -> tidak ada anomali bulan
    expect(m.anomalies.some((a) => a.kind === 'Bulan TMT beda dgn nama sheet')).toBe(false)

    const data = await makeRawXlsx({ MEI: [{ ...ROW_A, tmt: '1 Januari 2026' }] })
    const { rows, skipped } = await readRawFiles([{ name: 'MEI_DATA.xlsx', data }])
    const m2 = buildModel({
      rows,
      paragraphs,
      skipped,
      templateName: 'T.xlsx',
      templateSig: [],
    })
    expect(m2.anomalies.some((a) => a.kind === 'Bulan TMT beda dgn nama sheet')).toBe(true)
  })

  it('melaporkan nama pengganti yang kosong', async () => {
    const data = await makeRawXlsx({ MARET: [{ ...ROW_A, menjadi: '' }] })
    const { rows, skipped } = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])
    const m = buildModel({ rows, paragraphs, skipped, templateName: 'T.xlsx', templateSig: [] })
    expect(m.anomalies.some((a) => a.kind === 'NAMA PENGGANTI kosong')).toBe(true)
  })

  it('memakai "??" bila tanggal akhir tidak ditemukan', async () => {
    const data = await makeRawXlsx({ MARET: [{ ...ROW_A }] })
    const { rows, skipped } = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])
    const m = buildModel({ rows, paragraphs: [], skipped, templateName: 'T.xlsx', templateSig: [] })
    expect(m.sheets[0].rows[0].periodesasi).toBe('1 Mar 26 - ??')
    expect(m.anomalies.some((a) => a.kind === 'Tanggal akhir tidak ditemukan')).toBe(true)
  })

  it('mengurutkan sheet sesuai angkatan, tahun, lalu urutan provinsi', async () => {
    const data = await makeRawXlsx({
      MARET: [
        { ...ROW_A, prov: 'RIAU', periode: 'ANGKATAN 1 TAHUN 2026' },
        { ...ROW_A, prov: 'SUMATERA UTARA', periode: 'ANGKATAN 1 TAHUN 2026' },
        { ...ROW_A, prov: 'ACEH', periode: 'ANGKATAN 1 TAHUN 2025' },
      ],
    })
    const { rows, skipped } = await readRawFiles([{ name: 'MARET_DATA.xlsx', data }])
    const m = buildModel({ rows, paragraphs, skipped, templateName: 'T.xlsx', templateSig: [] })
    expect(m.sheets.map((s) => s.name)).toEqual([
      'I_2025_Aceh_Mar',
      'I_2026_Sumut_Mar',
      'I_2026_Riau_Mar',
    ])
    expect(m.sheets.map((s) => s.lampiran)).toEqual([1, 2, 3])
  })

  it('memecah sheet per bulan / per angkatan dan mengulang nomor LAMPIRAN', async () => {
    const dataMar = await makeRawXlsx({
      MARET: [
        { ...ROW_A, prov: 'ACEH', periode: 'ANGKATAN 1 TAHUN 2026' },
        { ...ROW_A, prov: 'BALI', periode: 'ANGKATAN 2 TAHUN 2026' },
      ],
    })
    const dataApr = await makeRawXlsx({ APRIL: [{ ...ROW_A, prov: 'ACEH', periode: 'ANGKATAN 1 TAHUN 2026' }] })
    const { rows, skipped } = await readRawFiles([
      { name: 'MARET_DATA.xlsx', data: dataMar },
      { name: 'APRIL_DATA.xlsx', data: dataApr },
    ])
    const m = buildModel({ rows, paragraphs, skipped, templateName: 'T.xlsx', templateSig: [] })

    const perBulan = splitSheets(m.sheets, 'bulan')
    expect(perBulan.map((g) => g.label)).toEqual(['Maret', 'April'])
    expect(perBulan[0].sheets.map((s) => s.lampiran)).toEqual([1, 2])
    expect(perBulan[1].sheets.map((s) => s.lampiran)).toEqual([1])

    const perAngkatan = splitSheets(m.sheets, 'angkatan')
    expect(perAngkatan.map((g) => g.label)).toEqual(['Angkatan I 2026', 'Angkatan II 2026'])

    const penuh = splitSheets(m.sheets, 'penuh')
    expect(penuh).toHaveLength(1)
    expect(penuh[0].sheets).toHaveLength(3)
    // mode penuh memakai nomor global, tidak diulang
    expect(penuh[0].sheets.map((s) => s.lampiran)).toEqual([1, 2, 3])
  })
})
