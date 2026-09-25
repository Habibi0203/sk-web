import { MONTH_ABBR, MONTH_KEY, ROMAN_TO_NUM, TYPO } from './constants'
import { clean, normProv } from './text'

/** Tanggal hasil parsing: [hari|undefined, bulan 1..12, tahun]. */
export type Tmt = readonly [number | undefined, number, number]

/** Kunci tanggal akhir periode: `${angkatan}|${tahun}|${program}|${provinsi}`. */
export type EndDateKey = string

export function endDateKey(
  angkatan: number,
  tahun: number,
  program: string,
  prov: string
): EndDateKey {
  return `${angkatan}|${tahun}|${program}|${prov}`
}

/**
 * Konversi serial tanggal Excel (sistem 1900) ke [hari, bulan, tahun].
 * Serial 60 = 29 Feb 1900 yang tidak ada di kalender nyata — Excel menganggapnya ada,
 * jadi untuk serial >= 60 perlu dikurangi 1 hari agar cocok dengan kalender Gregorian.
 */
export function serialToYMD(serial: number): Tmt {
  const days = Math.floor(serial) < 60 ? Math.floor(serial) + 1 : Math.floor(serial)
  // 30 Des 1899 sebagai titik nol, dihitung dalam UTC agar tidak bergeser timezone.
  const ms = Date.UTC(1899, 11, 30) + days * 86400000
  const d = new Date(ms)
  return [d.getUTCDate(), d.getUTCMonth() + 1, d.getUTCFullYear()]
}

/**
 * Parse nilai TMT. Menerima:
 *  - Date (dari ExcelJS) — dibaca dengan aksesor UTC
 *  - number (serial Excel)
 *  - string: "1 Maret 2026", "1 Mar 2026", "Februari 2026", "06 Mei 2026"
 * Mengembalikan null bila kosong atau tidak dikenali. Padanan parse_tmt() Python.
 */
export function parseTmt(v: unknown): Tmt | null {
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return null
    return [v.getUTCDate(), v.getUTCMonth() + 1, v.getUTCFullYear()]
  }
  if (typeof v === 'number' && Number.isFinite(v)) {
    return serialToYMD(v)
  }
  const s = clean(v)
  if (!s) return null

  // "1 Maret 2026" / "1-Mar-2026" / "06 Mei 2026"
  let m = /^(\d{1,2})[\s\-/.]+([A-Za-z]+)[\s\-/.]+(\d{4})$/.exec(s)
  if (m) {
    const mon = monthFromName(m[2])
    if (mon === null) return null
    return [Number(m[1]), mon, Number(m[3])]
  }

  // "Februari 2026"
  m = /^([A-Za-z]+)[\s\-/.]+(\d{4})$/.exec(s)
  if (m) {
    const mon = monthFromName(m[1])
    if (mon === null) return null
    return [undefined, mon, Number(m[2])]
  }

  return null
}

/** Nama bulan (bisa salah eja) -> nomor bulan. Padanan urutan cek MONTH_KEY lalu TYPO. */
function monthFromName(name: string): number | null {
  const k = name.toLowerCase()
  if (k in MONTH_KEY) return MONTH_KEY[k]
  if (k in TYPO) return TYPO[k]
  return null
}

/** Format TMT untuk kolom PERIODESASI: "1 Mar 26" atau "Feb 26". */
export function fmtTmt(t: Tmt): string {
  const [day, mon, yr] = t
  const mm = MONTH_ABBR[mon - 1]
  const yy = String(yr).slice(-2)
  return day ? `${day} ${mm} ${yy}` : `${mm} ${yy}`
}

/** Satu entri tanggal akhir dalam bentuk JSON (aset bawaan maupun tersimpan). */
export interface EntriEndDate {
  angkatan: number
  tahun: number
  program: string
  prov: string
  /** [hari|null, bulan, tahun] */
  isi: [number | null, number, number]
}

/** Ubah daftar entri JSON menjadi peta tanggal akhir. */
export function endDatesDariEntri(entri: readonly EntriEndDate[]): Map<EndDateKey, Tmt> {
  const out = new Map<EndDateKey, Tmt>()
  for (const e of entri) {
    out.set(endDateKey(e.angkatan, e.tahun, e.program, e.prov), [e.isi[0] ?? undefined, e.isi[1], e.isi[2]])
  }
  return out
}

/**
 * Ambil tanggal akhir periode dari daftar paragraf docx.
 * Struktur berjenjang: "Angkatan <Romawi> - <tahun>" -> "PIDI"/"PIDGI" -> "<PROG> - <PROV> - <tanggal>".
 * Padanan load_end_dates() Python, termasuk perbaikan tahun terpotong ("22 Februari 202").
 */
export function parseEndDates(paragraphs: readonly string[]): Map<EndDateKey, Tmt> {
  interface Raw {
    angkatan: number
    tahun: number
    program: string
    prov: string
    dateText: string
    yearDigits: number
  }

  let angkatan: number | null = null
  let tahun: number | null = null
  let program: string | null = null
  const raw: Raw[] = []

  for (const p of paragraphs) {
    const t = clean(p)
    if (!t) continue

    let m = /^Angkatan\s+([IVX]+)\s*-\s*(\d{4})$/i.exec(t)
    if (m) {
      angkatan = ROMAN_TO_NUM[m[1].toUpperCase()] ?? null
      tahun = Number(m[2])
      program = null
      continue
    }

    const up = t.toUpperCase()
    if (up === 'PIDI' || up === 'PIDGI') {
      program = up
      continue
    }

    m = /^(PIDI|PIDGI)\s*-\s*(.+?)\s*-\s*(\d{1,2}\s+\w+\s+\d{3,4})$/.exec(t)
    if (m && angkatan !== null && tahun !== null && program !== null) {
      const dateText = m[3]
      raw.push({
        angkatan,
        tahun,
        program: m[1].toUpperCase(),
        prov: normProv(m[2]),
        dateText,
        yearDigits: dateText.split(/\s+/).pop()!.length,
      })
    }
  }

  // Tahun terpotong -> pakai tahun yang paling sering muncul pada blok (angkatan, tahun) yang sama.
  const freq = new Map<string, Map<number, number>>()
  for (const r of raw) {
    if (r.yearDigits !== 4) continue
    const key = `${r.angkatan}|${r.tahun}`
    const yr = Number(r.dateText.split(/\s+/).pop())
    const bucket = freq.get(key) ?? new Map<number, number>()
    bucket.set(yr, (bucket.get(yr) ?? 0) + 1)
    freq.set(key, bucket)
  }
  const modal = new Map<string, number>()
  for (const [key, bucket] of freq) {
    let best = -1
    let bestCount = -1
    for (const [yr, count] of bucket) {
      if (count > bestCount) {
        best = yr
        bestCount = count
      }
    }
    modal.set(key, best)
  }

  const out = new Map<EndDateKey, Tmt>()
  for (const r of raw) {
    let tmt: Tmt | null
    if (r.yearDigits === 4) {
      tmt = parseTmt(r.dateText)
    } else {
      const yr = modal.get(`${r.angkatan}|${r.tahun}`)
      tmt = yr === undefined ? null : parseTmt(r.dateText.replace(/\d{3,4}$/, String(yr)))
    }
    if (tmt) out.set(endDateKey(r.angkatan, r.tahun, r.program, r.prov), tmt)
  }
  return out
}
