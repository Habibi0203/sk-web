import JSZip from 'jszip'

/**
 * Ukuran kertas F4 (215 × 330 mm) untuk berkas .xlsx.
 *
 * ExcelJS tidak punya ukuran bernama untuk F4, dan format OOXML juga tidak
 * menyediakan slot khusus untuknya — hanya ukuran standar bernama (Letter,
 * A4, Legal, dst). Karena itu ukuran F4 disuntikkan langsung ke XML setelah
 * berkas dibuat, memakai dua kunci yang dikenali Excel/WPS:
 *
 *   paperSize="5"     -> Letter (8,5 × 11 inci), ukuran terdekat yang dikenali
 *   paperHeight/paperWidth + paperSize="0" (custom)
 *
 * Yang paling aman dan paling luas didukung adalah mendeklarasikannya sebagai
 * ukuran khusus: paperSize="0" lalu memberi dimensi dalam satuan 1/100 mm.
 * Namun sebagian pembaca mengabaikan paperSize="0" dan jatuh ke ukuran bawaan.
 *
 * Pendekatan yang dipakai di sini: tulis paperSize="5" (Letter — sama-sama
 * 215,9 mm lebar, jadi lebar halaman tetap benar dan tabel tidak terpotong),
 * lalu tambahkan paperWidth/paperHeight eksplisit. Pembaca yang menghormati
 * dimensi khusus akan memakai 215 × 330 mm; yang tidak, tetap mendapat Letter
 * yang lebarnya hampir identik.
 */

/** 215 mm dan 330 mm dalam satuan 1/100 mm yang dipakai OOXML. */
export const F4_LEBAR = 21500
export const F4_TINGGI = 33000

/** paperSize=5 adalah Letter — lebar 8,5 inci = 215,9 mm, paling dekat dengan F4. */
const PAPER_LETTER = '5'

export interface PageSetupOpsi {
  orientation?: 'portrait' | 'landscape'
  scale?: number
}

/**
 * Sunting `xl/worksheets/sheetN.xml` di dalam berkas .xlsx:
 * - set ukuran kertas F4
 * - set orientasi dan skala
 * - pastikan tidak ada fitToPage yang menimpa (biarkan skala tetap yang berlaku)
 *
 * Mengembalikan ArrayBuffer baru.
 */
export async function terapkanKertasF4(
  data: ArrayBuffer,
  opsi: PageSetupOpsi = {}
): Promise<ArrayBuffer> {
  const orientation = opsi.orientation ?? 'landscape'
  const scale = opsi.scale ?? 85

  const zip = await JSZip.loadAsync(data)

  const namaSheet = Object.keys(zip.files)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a, b) => {
      const na = Number(a.match(/sheet(\d+)\.xml$/)![1])
      const nb = Number(b.match(/sheet(\d+)\.xml$/)![1])
      return na - nb
    })

  for (const nama of namaSheet) {
    const berkas = zip.file(nama)
    if (!berkas) continue
    let xml = await berkas.async('string')

    const pageSetupBaru =
      `<pageSetup paperSize="${PAPER_LETTER}" paperWidth="${F4_LEBAR}" ` +
      `paperHeight="${F4_TINGGI}" orientation="${orientation}" scale="${scale}" ` +
      `horizontalDpi="0" verticalDpi="0"/>`

    if (/<pageSetup\b[^>]*\/>/.test(xml)) {
      xml = xml.replace(/<pageSetup\b[^>]*\/>/, pageSetupBaru)
    } else if (/<pageSetup\b[^>]*>[\s\S]*?<\/pageSetup>/.test(xml)) {
      xml = xml.replace(/<pageSetup\b[^>]*>[\s\S]*?<\/pageSetup>/, pageSetupBaru)
    } else {
      // Belum ada pageSetup: sisipkan sebelum penutup worksheet.
      xml = xml.replace(/<\/worksheet>\s*$/, `${pageSetupBaru}</worksheet>`)
    }

    // FitToPage menimpa skala tetap — matikan supaya `scale` yang dipakai.
    xml = xml.replace(/<pageSetUpPr\b[^>]*fitToPage="1"[^>]*\/>/g, (m) =>
      m.replace('fitToPage="1"', 'fitToPage="0"')
    )

    zip.file(nama, xml)
  }

  return (await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' })) as ArrayBuffer
}

/** Baca kembali ukuran kertas dari XML — dipakai untuk pengujian & diagnosa. */
export async function bacaPageSetup(data: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(data)
  const out: string[] = []
  for (const nama of Object.keys(zip.files).filter((n) =>
    /^xl\/worksheets\/sheet\d+\.xml$/.test(n)
  )) {
    const berkas = zip.file(nama)
    if (!berkas) continue
    const xml = await berkas.async('string')
    const m = xml.match(/<pageSetup\b[^>]*\/>/)
    if (m) out.push(m[0])
  }
  return out
}