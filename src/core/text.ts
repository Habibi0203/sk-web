import { PROV_ALIAS } from './constants'

/** Ringkas spasi berlebih dan buang spasi di ujung. Padanan clean() Python. */
export function clean(v: unknown): string {
  if (v === null || v === undefined) return ''
  return String(v).replace(/\s+/g, ' ').trim()
}

/** Angka -> Romawi. Padanan to_roman() Python (menangani nilai besar juga). */
export function toRoman(n: number): string {
  const vals: ReadonlyArray<readonly [number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ]
  let out = ''
  let rest = Math.trunc(n)
  for (const [v, s] of vals) {
    while (rest >= v) {
      out += s
      rest -= v
    }
  }
  return out
}

/** Normalisasi nama provinsi ke nama resmi (uppercase). */
export function normProv(v: unknown): string {
  const p = clean(v).toUpperCase().replace(/\s+/g, ' ')
  return PROV_ALIAS[p] ?? p
}
