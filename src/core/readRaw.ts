import type ExcelJS from 'exceljs'
import { COLS } from './constants'
import { parseTmt } from './dates'
import { bulanDariNamaFile } from './naming'
import { clean, normProv } from './text'
import type { Program, RawRow, SkippedRow } from './types'

export interface RawFileInput {
  /** Nama berkas asal — dipakai untuk menebak bulan dan untuk jejak di daftar anomali. */
  name: string
  data: ArrayBuffer
  /** Bulan pilihan user. Bila kosong, ditebak dari nama berkas. */
  bulan?: number | null
}

export interface ReadRawResult {
  rows: RawRow[]
  skipped: SkippedRow[]
  /** Nama berkas yang bulannya tidak bisa ditentukan — UI harus meminta user memilih. */
  bulanTidakDiketahui: string[]
}

const PERIODE_RE = /ANGKATAN\s+(\d+)\s+TAHUN\s+(\d{4})/i
const HDR_SCAN_MAX = 10

/**
 * Ambil nilai mentah sebuah sel, membuka pembungkus yang dipakai ExcelJS
 * (rich text, hyperlink, hasil rumus). Tanggal dibiarkan sebagai Date.
 */
export function cellRaw(cell: ExcelJS.Cell): unknown {
  const v = cell.value
  if (v === null || v === undefined) return null
  if (typeof v !== 'object' || v instanceof Date) return v

  const o = v as unknown as Record<string, unknown>
  if ('richText' in o && Array.isArray(o.richText)) {
    return (o.richText as Array<{ text?: string }>).map((t) => t.text ?? '').join('')
  }
  if ('result' in o) return o.result
  if ('text' in o) return o.text
  return null
}

/** Teks sel yang sudah dirapikan. Tanggal menghasilkan string kosong. */
export function cellText(cell: ExcelJS.Cell): string {
  const raw = cellRaw(cell)
  if (raw instanceof Date) return ''
  return clean(raw)
}

/** Cari baris header: kolom A == "NO" dan kolom D mengandung "PROVINSI". */
export function findHeaderRow(ws: ExcelJS.Worksheet): number | null {
  const limit = Math.min(ws.rowCount, HDR_SCAN_MAX)
  for (let r = 1; r <= limit; r++) {
    const a = cellText(ws.getCell(r, 1)).toUpperCase()
    const d = cellText(ws.getCell(r, COLS.prov)).toUpperCase()
    if (a === 'NO' && d.includes('PROVINSI')) return r
  }
  return null
}

/**
 * Baca semua berkas data mentah menjadi daftar baris ternormalisasi.
 *
 * Toleran terhadap perbedaan format antar berkas: jumlah sheet berbeda-beda,
 * baris header bisa di baris 1 (berkas Februari) atau baris 3 (berkas lain).
 */
export async function readRawFiles(files: readonly RawFileInput[]): Promise<ReadRawResult> {
  const rows: RawRow[] = []
  const skipped: SkippedRow[] = []
  const bulanTidakDiketahui: string[] = []

  // ExcelJS dimuat saat dibutuhkan saja supaya halaman awal tetap ringan.
  const { default: ExcelJS } = await import('exceljs')

  for (const file of files) {
    const bulan = file.bulan ?? bulanDariNamaFile(file.name)
    if (bulan === null || bulan === undefined) {
      bulanTidakDiketahui.push(file.name)
      continue
    }

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(file.data)

    wb.eachSheet((ws) => {
      const hdr = findHeaderRow(ws)
      if (hdr === null) {
        skipped.push({ src: file.name, sheet: ws.name, reason: 'header tidak ditemukan' })
        return
      }

      for (let r = hdr + 1; r <= ws.rowCount; r++) {
        const row = ws.getRow(r)
        const periode = cellText(row.getCell(COLS.periode))
        const prov = cellText(row.getCell(COLS.prov))

        if (!periode || !prov) {
          // Baris benar-benar kosong dibiarkan lewat tanpa catatan.
          const adaIsi = [1, 2, 3, 4, 5, 6, 7, 8, 9].some((c) => cellText(row.getCell(c)) !== '')
          if (adaIsi) {
            skipped.push({
              src: file.name,
              sheet: ws.name,
              reason: `baris ${r}: provinsi/periode kosong`,
            })
          }
          continue
        }

        const m = PERIODE_RE.exec(periode.toUpperCase())
        if (!m) {
          skipped.push({
            src: file.name,
            sheet: ws.name,
            reason: `baris ${r}: periode '${periode}'`,
          })
          continue
        }

        const programRaw = cellText(row.getCell(COLS.program)).toUpperCase()
        const program: Program = programRaw.includes('PIDGI') ? 'PIDGI' : 'PIDI'
        const tmtRawValue = cellRaw(row.getCell(COLS.tmt))

        rows.push({
          src: file.name,
          sheet: ws.name,
          rowno: r,
          bulan,
          angkatan: Number(m[1]),
          tahun: Number(m[2]),
          program,
          prov: normProv(prov),
          kab: cellText(row.getCell(COLS.kab)),
          wahana: cellText(row.getCell(COLS.wahana)),
          semula: cellText(row.getCell(COLS.pendamping)),
          menjadi: cellText(row.getCell(COLS.pengganti)),
          tmt: parseTmt(tmtRawValue),
          tmtRaw: clean(tmtRawValue),
        })
      }
    })
  }

  return { rows, skipped, bulanTidakDiketahui }
}
