import JSZip from 'jszip'

/**
 * Baca paragraf dari berkas .docx.
 *
 * Sengaja TIDAK memakai DOMParser supaya modul ini tetap bisa diuji di Node
 * tanpa perlu lingkungan DOM. Berkas .docx pada dasarnya ZIP berisi XML,
 * dan struktur yang kita butuhkan (daftar paragraf + teksnya) cukup teratur
 * untuk dibaca dengan pencocokan pola.
 *
 * Paragraf di dalam tabel dibuang lebih dulu, supaya hasilnya sepadan dengan
 * `document.paragraphs` milik python-docx (yang hanya melihat paragraf badan).
 */
export async function parseDocxParagraphs(data: ArrayBuffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(data)
  const entry = zip.file('word/document.xml')
  if (!entry) throw new Error('Berkas .docx tidak berisi word/document.xml')

  const xml = await entry.async('string')

  // Buang seluruh blok tabel agar paragraf di dalam tabel tidak ikut terbaca.
  const tanpaTabel = xml.replace(/<w:tbl\b[\s\S]*?<\/w:tbl>/g, '')

  const paragraphs: string[] = []
  const pRe = /<w:p\b[^>]*>([\s\S]*?)<\/w:p>|<w:p\b[^>]*\/>/g
  let m: RegExpExecArray | null
  while ((m = pRe.exec(tanpaTabel)) !== null) {
    const inner = m[1] ?? ''
    // Gabungkan SEMUA <w:t> dalam satu paragraf — teks sering terpecah
    // menjadi beberapa potongan karena perubahan format di tengah kalimat.
    const tRe = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g
    let t: RegExpExecArray | null
    let text = ''
    while ((t = tRe.exec(inner)) !== null) text += decodeXml(t[1])
    paragraphs.push(text)
  }
  return paragraphs
}

/** Buka entitas XML yang umum dipakai Word. */
export function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&')
}
