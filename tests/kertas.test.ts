import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { terapkanKertasF4, bacaPageSetup, F4_LEBAR, F4_TINGGI } from '../src/core/kertasF4'

/** Bikin .xlsx minimal berisi dua sheet untuk menguji penyuntingan XML. */
async function makeXlsx(): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file(
    'xl/worksheets/sheet1.xml',
    '<?xml version="1.0"?><worksheet><sheetData/><pageSetup paperSize="258" scale="85"/></worksheet>'
  )
  zip.file(
    'xl/worksheets/sheet2.xml',
    '<?xml version="1.0"?><worksheet><sheetData/></worksheet>'
  )
  zip.file(
    'xl/worksheets/sheet10.xml',
    '<?xml version="1.0"?><worksheet><sheetData/><pageSetup paperSize="258"/></worksheet>'
  )
  return (await zip.generateAsync({ type: 'arraybuffer' })) as ArrayBuffer
}

describe('terapkanKertasF4', () => {
  it('mengganti pageSetup yang sudah ada dengan ukuran F4', async () => {
    const hasil = await terapkanKertasF4(await makeXlsx())
    const semua = await bacaPageSetup(hasil)

    expect(semua).toHaveLength(3)
    for (const s of semua) {
      expect(s).toContain(`paperWidth="${F4_LEBAR}"`)
      expect(s).toContain(`paperHeight="${F4_TINGGI}"`)
      expect(s).toContain('paperSize="5"')
      expect(s).toContain('orientation="landscape"')
      expect(s).toContain('scale="85"')
    }
    // tidak ada sisa ukuran lama
    expect(semua.join(' ')).not.toContain('paperSize="258"')
  })

  it('menyisipkan pageSetup pada sheet yang belum punya', async () => {
    const hasil = await terapkanKertasF4(await makeXlsx())
    const zip = await JSZip.loadAsync(hasil)
    const xml2 = await zip.file('xl/worksheets/sheet2.xml')!.async('string')
    expect(xml2).toContain('<pageSetup')
    expect(xml2).toContain(`paperHeight="${F4_TINGGI}"`)
  })

  it('menangani nomor sheet dua digit (sheet10) dan tidak tertukar urutannya', async () => {
    const hasil = await terapkanKertasF4(await makeXlsx())
    const zip = await JSZip.loadAsync(hasil)
    const xml10 = await zip.file('xl/worksheets/sheet10.xml')!.async('string')
    expect(xml10).toContain(`paperWidth="${F4_LEBAR}"`)
  })

  it('mempertahankan berkas lain di dalam zip', async () => {
    const zip0 = new JSZip()
    zip0.file('xl/worksheets/sheet1.xml', '<worksheet><sheetData/></worksheet>')
    zip0.file('xl/styles.xml', '<styleSheet>PENTING</styleSheet>')
    zip0.file('[Content_Types].xml', '<Types/>')
    const buf = (await zip0.generateAsync({ type: 'arraybuffer' })) as ArrayBuffer

    const hasil = await terapkanKertasF4(buf)
    const zip = await JSZip.loadAsync(hasil)
    expect(await zip.file('xl/styles.xml')!.async('string')).toContain('PENTING')
    expect(zip.file('[Content_Types].xml')).toBeTruthy()
  })

  it('mematikan fitToPage supaya skala tetap yang dipakai', async () => {
    const zip0 = new JSZip()
    zip0.file(
      'xl/worksheets/sheet1.xml',
      '<worksheet><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetData/></worksheet>'
    )
    const buf = (await zip0.generateAsync({ type: 'arraybuffer' })) as ArrayBuffer

    const hasil = await terapkanKertasF4(buf)
    const z = await JSZip.loadAsync(hasil)
    const xml = await z.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(xml).toContain('fitToPage="0"')
    expect(xml).not.toContain('fitToPage="1"')
  })

  it('menghormati opsi orientasi dan skala', async () => {
    const hasil = await terapkanKertasF4(await makeXlsx(), {
      orientation: 'portrait',
      scale: 100,
    })
    const semua = await bacaPageSetup(hasil)
    for (const s of semua) {
      expect(s).toContain('orientation="portrait"')
      expect(s).toContain('scale="100"')
    }
  })
})