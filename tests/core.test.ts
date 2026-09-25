import { describe, expect, it } from 'vitest'
import { autofitHeight, wrapLines } from '../src/core/autofit'
import { fmtTmt, parseEndDates, parseTmt, serialToYMD } from '../src/core/dates'
import { normProv, toRoman } from '../src/core/text'
import {
  bulanDariNamaFile,
  compareSheetKey,
  modeGroupKey,
  sheetName,
  type SheetKey,
} from '../src/core/naming'

// Lebar kolom template (A..G), dari dump Template.xlsx
const W = [4.77734375, 19.5546875, 33.5546875, 29.77734375, 27.77734375, 30.44140625, 29.44140625]

describe('toRoman', () => {
  it('mengubah angka ke romawi', () => {
    expect(toRoman(1)).toBe('I')
    expect(toRoman(4)).toBe('IV')
    expect(toRoman(9)).toBe('IX')
    expect(toRoman(40)).toBe('XL')
    expect(toRoman(51)).toBe('LI')
    expect(toRoman(60)).toBe('LX')
  })
})

describe('normProv', () => {
  it('menyamakan variasi penulisan provinsi', () => {
    expect(normProv('DIY')).toBe('DI YOGYAKARTA')
    expect(normProv('Yogyakarta')).toBe('DI YOGYAKARTA')
    expect(normProv('NTT')).toBe('NUSA TENGGARA TIMUR')
    expect(normProv('Kalimantan Tmur')).toBe('KALIMANTAN TIMUR')
    expect(normProv('  kepulauan   riau ')).toBe('KEPULAUAN RIAU')
    expect(normProv('JAWA BARAT')).toBe('JAWA BARAT')
  })
})

describe('serialToYMD', () => {
  it('mengubah serial Excel ke tanggal', () => {
    expect(serialToYMD(1)).toEqual([1, 1, 1900])
    expect(serialToYMD(45658)).toEqual([1, 1, 2025])
    expect(serialToYMD(46023)).toEqual([1, 1, 2026])
    // Dua nilai ini yang muncul di file APRIL
    expect(serialToYMD(46113)).toEqual([1, 4, 2026])
    expect(serialToYMD(46137)).toEqual([25, 4, 2026])
  })
})

describe('parseTmt', () => {
  it('membaca berbagai bentuk penulisan', () => {
    expect(parseTmt('1 Maret 2026')).toEqual([1, 3, 2026])
    expect(parseTmt('06 Mei 2026')).toEqual([6, 5, 2026])
    expect(parseTmt('1 MEI 2026')).toEqual([1, 5, 2026])
    expect(parseTmt('Februari 2026')).toEqual([undefined, 2, 2026])
    expect(parseTmt('1-Mar-2026')).toEqual([1, 3, 2026])
  })

  it('mentoleransi ejaan salah', () => {
    expect(parseTmt('Februati 2026')).toEqual([undefined, 2, 2026])
    expect(parseTmt('Janauri 2026')).toEqual([undefined, 1, 2026])
  })

  it('membaca Date dan serial number', () => {
    expect(parseTmt(new Date(Date.UTC(2026, 3, 25)))).toEqual([25, 4, 2026])
    expect(parseTmt(46113)).toEqual([1, 4, 2026])
  })

  it('mengembalikan null untuk kosong atau tidak dikenali', () => {
    expect(parseTmt('')).toBeNull()
    expect(parseTmt(null)).toBeNull()
    expect(parseTmt('entah apa')).toBeNull()
  })
})

describe('fmtTmt', () => {
  it('memformat dengan dan tanpa hari', () => {
    expect(fmtTmt([1, 3, 2026])).toBe('1 Mar 26')
    expect(fmtTmt([undefined, 2, 2026])).toBe('Feb 26')
    expect(fmtTmt([25, 4, 2026])).toBe('25 Apr 26')
  })
})

describe('autofitHeight', () => {
  // CATATAN: semua nilai di tes ini SINTETIS. Jangan pernah menyalin nama orang,
  // nomor STR, atau data asli ke dalam kode/tes — repositori ini akan di-push ke GitHub.
  it('baris pendek tetap satu baris (15.0)', () => {
    const row = [
      1,
      'KOTA CONTOH',
      'dr. Andi Pratama',
      'RS Contoh',
      'dr. Budi Santoso',
      'RS Contoh',
      'Mei 26 - 24 Jun 27',
    ]
    expect(autofitHeight(row, W)).toBe(15)
  })

  it('wahana panjang jadi dua baris (26.4) — cocok dengan hasil Excel', () => {
    const row = [
      1,
      'KOTA CONTOH',
      'dr. Andi Pratama',
      'UPT PUSKESMAS CONTOH SENTOSA',
      'dr. Rina Ayu Lestari, M.Kes',
      'UPT PUSKESMAS CONTOH SENTOSA',
      '1 Mar 26 - 22 Feb 27',
    ]
    expect(autofitHeight(row, W)).toBe(26.4)
  })

  it('menghitung sel yang di-merge (E:G) memakai lebar gabungan', () => {
    const teksPanjang =
      'KANTOR PUSAT DIREKTORAT JENDERAL SUMBER DAYA MANUSIA KESEHATAN,'
    // Muat satu baris karena E:G digabung (lebar ~87.7)
    expect(autofitHeight([null, null, null, null, teksPanjang, null, null], W, [4, 6])).toBe(15)
    // Tanpa merge, kolom E saja tidak cukup
    expect(autofitHeight([null, null, null, null, teksPanjang, null, null], W)).toBeGreaterThan(15)
  })

  it('wrapLines menghitung per kata', () => {
    expect(wrapLines('RS Contoh', 29.28)).toBe(1)
    expect(wrapLines('UPT PUSKESMAS CONTOH SENTOSA', 29.28)).toBe(2)
  })
})

describe('sheetName', () => {
  const base: SheetKey = { angkatan: 1, tahun: 2026, program: 'PIDI', prov: 'SUMATERA UTARA', bulan: 3 }

  it('membentuk nama sheet sesuai format', () => {
    expect(sheetName(base)).toBe('I_2026_Sumut_Mar')
    expect(sheetName({ ...base, prov: 'KEPULAUAN BANGKA BELITUNG', bulan: 2 })).toBe('I_2026_Babel_Feb')
    expect(sheetName({ ...base, angkatan: 3, tahun: 2025, prov: 'JAWA BARAT', bulan: 4 })).toBe('III_2025_Jabar_Apr')
  })

  it('menambah akhiran (PIDGI)', () => {
    expect(sheetName({ ...base, program: 'PIDGI', prov: 'JAWA BARAT', bulan: 5, angkatan: 2 })).toBe(
      'II_2026_Jabar_Mei (PIDGI)'
    )
  })

  it('memakai Title Case untuk provinsi di luar daftar', () => {
    expect(sheetName({ ...base, prov: 'PROVINSI BARU' })).toBe('I_2026_Provinsi Baru_Mar')
  })
})

describe('compareSheetKey', () => {
  it('mengurutkan angkatan lalu tahun lalu provinsi lalu bulan', () => {
    const keys: SheetKey[] = [
      { angkatan: 2, tahun: 2026, program: 'PIDI', prov: 'JAWA BARAT', bulan: 5 },
      { angkatan: 1, tahun: 2026, program: 'PIDI', prov: 'SUMATERA UTARA', bulan: 3 },
      { angkatan: 1, tahun: 2026, program: 'PIDI', prov: 'RIAU', bulan: 4 },
      { angkatan: 1, tahun: 2025, program: 'PIDI', prov: 'ACEH', bulan: 2 },
    ]
    const sorted = [...keys].sort(compareSheetKey).map((k) => sheetName(k))
    // Urutan provinsi mengikuti PROV_ORDER: Sumut (1) sebelum Riau (3).
    expect(sorted).toEqual(['I_2025_Aceh_Feb', 'I_2026_Sumut_Mar', 'I_2026_Riau_Apr', 'II_2026_Jabar_Mei'])
  })

  it('PIDI mendahului PIDGI pada kelompok yang sama', () => {
    const pidi: SheetKey = { angkatan: 2, tahun: 2026, program: 'PIDI', prov: 'JAWA BARAT', bulan: 5 }
    const pidgi: SheetKey = { ...pidi, program: 'PIDGI' }
    expect(compareSheetKey(pidi, pidgi)).toBeLessThan(0)
  })
})

describe('bulanDariNamaFile', () => {
  it('menebak bulan dari nama file', () => {
    expect(bulanDariNamaFile('FEBRUARI_DATA PEGGANTIAN PENDAMPING.xlsx')).toBe(2)
    expect(bulanDariNamaFile('MARET_DATA PENGGANTIAN PENDAMPING PIDI DAN PIDGI.xlsx')).toBe(3)
    expect(bulanDariNamaFile('APRIL_DATA PENGGANTIAN PENDAMPING PIDI DAN PIDGI.xlsx')).toBe(4)
    expect(bulanDariNamaFile('MEI_DATA PENGGANTIAN PENDAMPING PIDI DAN PIDGI.xlsx')).toBe(5)
  })

  it('mengembalikan null bila tidak ada nama bulan', () => {
    expect(bulanDariNamaFile('data penggantian.xlsx')).toBeNull()
  })
})

describe('modeGroupKey', () => {
  const k: SheetKey = { angkatan: 2, tahun: 2026, program: 'PIDI', prov: 'JAWA BARAT', bulan: 5 }
  it('mengelompokkan sesuai mode', () => {
    expect(modeGroupKey('penuh', k)).toBe('ALL')
    expect(modeGroupKey('bulan', k)).toBe('B5')
    expect(modeGroupKey('angkatan', k)).toBe('A2-2026')
  })
})

describe('parseEndDates', () => {
  it('membaca struktur berjenjang dan memperbaiki tahun terpotong', () => {
    const paras = [
      'Angkatan II - 2025',
      'PIDI',
      'PIDI - ACEH - 19 Februari 2026',
      'PIDI - SUMATERA UTARA - 22 Februari 202',
      'PIDGI',
      'PIDGI - BALI - 3 Maret 2026',
    ]
    const out = parseEndDates(paras)
    expect(out.get('2|2025|PIDI|ACEH')).toEqual([19, 2, 2026])
    // tahun terpotong "202" diperbaiki jadi 2026 mengikuti tahun modus blok yang sama
    expect(out.get('2|2025|PIDI|SUMATERA UTARA')).toEqual([22, 2, 2026])
    expect(out.get('2|2025|PIDGI|BALI')).toEqual([3, 3, 2026])
  })
})
