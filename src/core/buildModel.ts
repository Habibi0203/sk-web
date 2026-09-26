import { ANGKATAN_COLOR, PROV_IDX } from './constants'
import { endDateKey, fmtTmt, type EndDateKey, type Tmt } from './dates'
import {
  compareSheetKey,
  modeGroupKey,
  modeGroupLabel,
  sheetName,
  type OutputMode,
  type SheetKey,
} from './naming'
import type {
  Anomaly,
  BuildModel,
  OutRow,
  RawRow,
  SheetModel,
  SkippedRow,
} from './types'

export interface BuildInput {
  rows: readonly RawRow[]
  /**
   * Peta tanggal akhir periode. Bisa berasal dari berkas .docx yang diunggah
   * maupun dari aset bawaan — keduanya menghasilkan bentuk yang sama.
   */
  endDates: ReadonlyMap<EndDateKey, Tmt>
  /** Nama sumber tanggal akhir, ditampilkan di UI. */
  sumberPeriode: string
  skipped: readonly SkippedRow[]
  templateName: string
  /** Teks blok tanda tangan hasil pembacaan template. */
  templateSig: readonly string[]
  /**
   * Berkas template mentah, dipakai untuk mengkloning sheet saat ekspor.
   * Opsional supaya pemakaian yang hanya butuh model (mis. pratinjau) tidak
   * perlu menyertakannya.
   */
  templateData?: ArrayBuffer | null
}

/**
 * Susun seluruh sheet dari baris data mentah.
 *
 * Urutan: angkatan -> tahun -> provinsi (urutan PROV_ORDER) -> bulan -> PIDI sebelum PIDGI.
 * Nomor `lampiran` di sini masih global; saat berkas dipecah, nomornya dihitung ulang per berkas.
 */
export function buildModel(input: BuildInput): BuildModel {
  const endDates = input.endDates

  // --- kelompokkan
  const groups = new Map<string, { key: SheetKey; rows: RawRow[] }>()
  for (const row of input.rows) {
    const key: SheetKey = {
      angkatan: row.angkatan,
      tahun: row.tahun,
      program: row.program,
      prov: row.prov,
      bulan: row.bulan,
    }
    const gk = `${row.angkatan}|${row.tahun}|${row.program}|${row.prov}|${row.bulan}`
    const g = groups.get(gk)
    if (g) g.rows.push(row)
    else groups.set(gk, { key, rows: [row] })
  }

  const ordered = [...groups.values()].sort((a, b) => compareSheetKey(a.key, b.key))

  const anomalies: Anomaly[] = []
  const sig = [0, 1, 2].map((i) => input.templateSig[i] ?? '')

  const sheets: SheetModel[] = ordered.map((group, idx) => {
    const { key, rows } = group
    const name = sheetName(key)
    const endKey: EndDateKey = endDateKey(key.angkatan, key.tahun, key.program, key.prov)
    const end = endDates.get(endKey)

    if (end === undefined) {
      anomalies.push({
        sheet: name,
        no: null,
        kind: 'Tanggal akhir tidak ditemukan',
        lokasi: `${key.prov} (${key.program})`,
        periodesasi: '',
        catatan: 'Tidak ada di berkas Rekapitulasi Periode. Kolom PERIODESASI akan berisi "??".',
      })
    }
    if (PROV_IDX[key.prov] === undefined) {
      anomalies.push({
        sheet: name,
        no: null,
        kind: 'Provinsi tidak dikenal',
        lokasi: key.prov,
        periodesasi: '',
        catatan: 'Tidak ada di daftar 38 provinsi — urutan sheet memakai posisi paling akhir.',
      })
    }

    const endS = end === undefined ? '??' : fmtTmt(end)

    const outRows: OutRow[] = rows.map((row, j) => {
      const no = j + 1
      let periodesasi: string
      let tmtKosong = false

      if (row.tmt === null) {
        tmtKosong = true
        periodesasi = `X - ${endS}`
        anomalies.push({
          sheet: name,
          no,
          kind: 'TMT kosong',
          lokasi: `${row.kab} | ${row.wahana}`,
          periodesasi,
          catatan: 'Isi TMT manual, lalu hapus sorotan kuning.',
        })
      } else {
        const start = fmtTmt(row.tmt)
        periodesasi = `${start} - ${endS}`
        if (row.tmt[1] !== key.bulan) {
          anomalies.push({
            sheet: name,
            no,
            kind: 'Bulan TMT beda dgn nama sheet',
            lokasi: `${row.kab} | ${row.wahana}`,
            periodesasi,
            catatan: `Sheet bulan ke-${key.bulan}, tetapi TMT "${start}". Bulan sheet diambil dari nama berkas.`,
          })
        }
      }

      if (!row.menjadi) {
        anomalies.push({
          sheet: name,
          no,
          kind: 'NAMA PENGGANTI kosong',
          lokasi: `${row.kab} | ${row.wahana}`,
          periodesasi,
          catatan: 'Lengkapi data.',
        })
      }

      return {
        no,
        kab: row.kab,
        semula: row.semula,
        wahana: row.wahana,
        menjadi: row.menjadi,
        periodesasi,
        tmtKosong,
      }
    })

    return {
      key,
      name,
      tabColor: ANGKATAN_COLOR[key.angkatan] ?? '808080',
      lampiran: idx + 1,
      rows: outRows,
      sig,
    }
  })

  for (const s of input.skipped) {
    anomalies.push({
      sheet: s.sheet,
      no: null,
      kind: 'Baris dilewati',
      lokasi: s.src,
      periodesasi: '',
      catatan: s.reason,
    })
  }

  return {
    sheets,
    skipped: [...input.skipped],
    anomalies,
    templateName: input.templateName,
    sumberPeriode: input.sumberPeriode,
    rawCount: input.rows.length,
    templateData: input.templateData ?? null,
  }
}

export interface OutputGroup {
  /** Kunci kelompok; 'ALL' untuk mode rekap penuh. */
  id: string
  /** Label untuk nama berkas dan judul di UI. */
  label: string
  sheets: SheetModel[]
}

/**
 * Pecah daftar sheet menjadi berkas-berkas keluaran sesuai mode.
 *
 * Nomor LAMPIRAN dihitung ulang mulai dari 1 di setiap berkas, karena tiap berkas
 * dianggap SK yang berdiri sendiri.
 */
export function splitSheets(sheets: readonly SheetModel[], mode: OutputMode): OutputGroup[] {
  if (mode === 'penuh') {
    return [{ id: 'ALL', label: modeGroupLabel('penuh', sheets[0]?.key ?? emptyKey()), sheets: [...sheets] }]
  }

  const groups = new Map<string, OutputGroup>()
  for (const s of sheets) {
    const id = modeGroupKey(mode, s.key)
    let g = groups.get(id)
    if (!g) {
      g = { id, label: modeGroupLabel(mode, s.key), sheets: [] }
      groups.set(id, g)
    }
    g.sheets.push(s)
  }

  const out = [...groups.values()]
  for (const g of out) {
    g.sheets = g.sheets.map((s, i) => ({ ...s, lampiran: i + 1 }))
  }
  return out
}

function emptyKey(): SheetKey {
  return { angkatan: 1, tahun: 0, program: 'PIDI', prov: '', bulan: 1 }
}

/** Ringkasan satu kali pemrosesan — dipakai untuk riwayat. Tidak memuat data pribadi. */
export interface RingkasanPemrosesan {
  sheets: Array<{
    nama: string
    baris: number
    program: string
    provinsi: string
    angkatan: number
    tahun: number
    bulan: number
  }>
  jumlahSheet: number
  jumlahBaris: number
  jumlahAnomali: number
  anomaliPerJenis: Record<string, number>
}

export function ringkasModel(m: BuildModel): RingkasanPemrosesan {
  const perJenis: Record<string, number> = {}
  for (const a of m.anomalies) perJenis[a.kind] = (perJenis[a.kind] ?? 0) + 1

  return {
    sheets: m.sheets.map((s) => ({
      nama: s.name,
      baris: s.rows.length,
      program: s.key.program,
      provinsi: s.key.prov,
      angkatan: s.key.angkatan,
      tahun: s.key.tahun,
      bulan: s.key.bulan,
    })),
    jumlahSheet: m.sheets.length,
    jumlahBaris: m.sheets.reduce((a, s) => a + s.rows.length, 0),
    jumlahAnomali: m.anomalies.length,
    anomaliPerJenis: perJenis,
  }
}
