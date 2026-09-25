/**
 * Auto-fit tinggi baris — port 1:1 dari build_sk.py.
 *
 * Perkiraan lebar karakter Bookman Old Style 10pt, dinyatakan dalam satuan lebar kolom Excel
 * (1 unit ~ lebar angka '0' Calibri 11 ~ 7 px). Nilai kalibrasi sudah diverifikasi terhadap
 * hasil auto-fit Excel: 2 baris = 26.4 pt.
 */

export const CHAR_UNITS = {
  sp: 0.5,
  digit: 1.0,
  up: 1.3,
  narrow: 0.6,
  low: 1.0,
  punct: 0.5,
} as const

const NARROW = new Set("iljtf.,:;'\"|!()[]{}".split(''))

export const LINE_H = 13.2 // tinggi 1 baris teks 10pt Bookman Old Style
export const MIN_ROW_H = 15.0 // tinggi baris default Excel
export const ROW_SAFETY = 1.06 // margin aman supaya teks tidak kepotong
export const CELL_PAD = 0.5 // padding kiri-kanan sel

const RE_DIGIT = /\p{Nd}/u
const RE_ALPHA = /\p{L}/u

function isUpper(ch: string): boolean {
  return ch !== ch.toLowerCase() && ch === ch.toUpperCase()
}

/** Estimasi lebar teks dalam satuan lebar kolom Excel. */
export function textUnits(s: string): number {
  let u = 0
  for (const ch of s) {
    if (ch === ' ') u += CHAR_UNITS.sp
    else if (RE_DIGIT.test(ch)) u += CHAR_UNITS.digit
    else if (isUpper(ch)) u += CHAR_UNITS.up
    else if (NARROW.has(ch)) u += CHAR_UNITS.narrow
    else if (RE_ALPHA.test(ch)) u += CHAR_UNITS.low
    else u += CHAR_UNITS.punct
  }
  return u * ROW_SAFETY
}

/** Jumlah baris yang dibutuhkan `text` bila di-wrap pada kolom berlebar `width`. */
export function wrapLines(text: unknown, width: number): number {
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return 1

  let lines = 1
  let cur = 0
  for (const w of words) {
    const uw = textUnits(w)
    const add = cur === 0 ? uw : uw + CHAR_UNITS.sp * ROW_SAFETY
    if (cur > 0 && cur + add > width) {
      lines += 1
      cur = uw
    } else {
      cur += add
    }
  }
  return lines
}

/** Nilai sel yang relevan untuk perhitungan tinggi. */
export type CellValue = string | number | null | undefined

/**
 * Tinggi baris (pt) hasil auto-fit.
 *
 * @param values    nilai kolom A..G (indeks 0..6)
 * @param widths    lebar kolom A..G (indeks 0..6)
 * @param mergeSpan pasangan indeks kolom (0-based, inklusif) bila sel di-merge, mis. [4, 6] untuk E:G
 */
export function autofitHeight(
  values: readonly CellValue[],
  widths: readonly number[],
  mergeSpan?: readonly [number, number]
): number {
  let lines = 1

  if (mergeSpan) {
    const [c1, c2] = mergeSpan
    let w = 0
    for (let c = c1; c <= c2; c++) w += widths[c] ?? 10
    const v = values[c1]
    if (v !== null && v !== undefined) lines = wrapLines(v, w - CELL_PAD)
  } else {
    for (let c = 0; c < Math.min(values.length, widths.length); c++) {
      const v = values[c]
      if (v === null || v === undefined || v === '') continue
      lines = Math.max(lines, wrapLines(v, (widths[c] ?? 10) - CELL_PAD))
    }
  }

  return Math.max(MIN_ROW_H, round1(lines * LINE_H))
}

/** Pembulatan 1 desimal seperti round(x, 1) di Python. */
function round1(x: number): number {
  return Math.round(x * 10) / 10
}
