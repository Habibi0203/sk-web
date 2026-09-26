import { describe, expect, it } from 'vitest'
import JSZip from 'jszip'
import { terapkanEdit, kunciEdit, bersihkanEdit, hitungEditPerSheet } from '../src/storage/edits'
import { splitSheets, type OutputGroup } from '../src/core/buildModel'
import type { SheetModel } from '../src/core/types'

// Semua data SINTETIS.

function sheet(over: Partial<SheetModel['rows'][number]> = {}): SheetModel {
  return {
    key: { angkatan: 2, tahun: 2025, program: 'PIDI', prov: 'JAWA BARAT', bulan: 3 },
    name: 'II_2025_Jabar_Mar',
    tabColor: '00B050',
    lampiran: 1,
    sig: ['KUASA PENGGUNA ANGGARAN', 'KANTOR PUSAT ...', 'dr. Contoh Penandatangan'],
    rows: [
      {
        no: 1,
        kab: 'Kota Contoh',
        semula: 'dr. Andi Pratama',
        wahana: 'PKM Contoh Satu',
        menjadi: 'dr. Budi Santoso',
        periodesasi: '1 Mar 26 - 26 Nov 26',
        tmtKosong: false,
        ...over,
      },
    ],
  }
}

describe('terapkanEdit', () => {
  it('menerapkan nilai baru pada kolom yang disunting', () => {
    const s = sheet()
    const edit = new Map<string, string>([
      [kunciEdit(s.name, 14, 5), 'dr. Citra Dewi'],
      [kunciEdit(s.name, 14, 7), '2 Apr 26 - 26 Nov 26'],
    ])
    const [hasil] = terapkanEdit([s], edit)

    expect(hasil.rows[0].menjadi).toBe('dr. Citra Dewi')
    expect(hasil.rows[0].periodesasi).toBe('2 Apr 26 - 26 Nov 26')
    // kolom yang tidak disunting tidak berubah
    expect(hasil.rows[0].kab).toBe('Kota Contoh')
    expect(hasil.rows[0].semula).toBe('dr. Andi Pratama')
  })

  it('tidak mengubah apa pun bila peta kosong', () => {
    const s = sheet()
    const [hasil] = terapkanEdit([s], new Map())
    expect(hasil).toEqual(s)
  })

  it('hanya menyentuh sheet dan baris yang sesuai', () => {
    const a = sheet()
    const b: SheetModel = { ...sheet(), name: 'II_2025_Riau_Mar', rows: [{ ...sheet().rows[0] }] }

    const edit = new Map<string, string>([[kunciEdit(a.name, 14, 5), 'dr. Citra Dewi']])
    const [ra, rb] = terapkanEdit([a, b], edit)

    expect(ra.rows[0].menjadi).toBe('dr. Citra Dewi')
    expect(rb.rows[0].menjadi).toBe('dr. Budi Santoso') // tidak terpengaruh
  })

  it('menerapkan edit pada baris kedua memakai nomor baris berkas (15)', () => {
    const s = sheet()
    s.rows.push({ ...s.rows[0], no: 2, menjadi: 'dr. Kedua' })
    const edit = new Map<string, string>([[kunciEdit(s.name, 15, 5), 'dr. Diubah']])
    const [hasil] = terapkanEdit([s], edit)

    expect(hasil.rows[0].menjadi).toBe('dr. Budi Santoso') // baris 14 tidak berubah
    expect(hasil.rows[1].menjadi).toBe('dr. Diubah')
  })

  it('melepas sorotan TMT kosong bila PERIODESASI disunting manual', () => {
    const s = sheet({ periodesasi: 'X - 26 Nov 26', tmtKosong: true })
    expect(s.rows[0].tmtKosong).toBe(true)

    const edit = new Map<string, string>([[kunciEdit(s.name, 14, 7), '1 Mar 26 - 26 Nov 26']])
    const [hasil] = terapkanEdit([s], edit)

    expect(hasil.rows[0].tmtKosong).toBe(false)
  })

  it('TIDAK melepas sorotan bila yang disunting kolom lain', () => {
    const s = sheet({ periodesasi: 'X - 26 Nov 26', tmtKosong: true })
    const edit = new Map<string, string>([[kunciEdit(s.name, 14, 5), 'dr. Citra Dewi']])
    const [hasil] = terapkanEdit([s], edit)

    expect(hasil.rows[0].tmtKosong).toBe(true)
  })

  it('tidak mengubah model aslinya (immutable)', () => {
    const s = sheet()
    const asli = JSON.stringify(s)
    terapkanEdit([s], new Map([[kunciEdit(s.name, 14, 5), 'X']]))
    expect(JSON.stringify(s)).toBe(asli)
  })
})

describe('bersihkanEdit', () => {
  it('menghapus semua edit pada satu sheet saja', () => {
    const edit = new Map<string, string>([
      [kunciEdit('A', 14, 5), 'x'],
      [kunciEdit('A', 15, 5), 'y'],
      [kunciEdit('B', 14, 5), 'z'],
    ])
    const hasil = bersihkanEdit(edit, 'A')

    expect([...hasil.keys()]).toEqual([kunciEdit('B', 14, 5)])
  })

  it('tidak menghapus sheet lain yang namanya berawalan sama', () => {
    const edit = new Map<string, string>([
      [kunciEdit('II_2025_Jabar_Mar', 14, 5), 'x'],
      [kunciEdit('II_2025_Jabar_Mar (PIDGI)', 14, 5), 'y'],
    ])
    const hasil = bersihkanEdit(edit, 'II_2025_Jabar_Mar')
    expect([...hasil.keys()]).toEqual([kunciEdit('II_2025_Jabar_Mar (PIDGI)', 14, 5)])
  })
})

describe('hitungEditPerSheet', () => {
  it('menghitung jumlah edit per sheet', () => {
    const edit = new Map<string, string>([
      [kunciEdit('A', 14, 5), 'x'],
      [kunciEdit('A', 14, 7), 'y'],
      [kunciEdit('B', 14, 5), 'z'],
    ])
    const m = hitungEditPerSheet(edit)
    expect(m.get('A')).toBe(2)
    expect(m.get('B')).toBe(1)
    expect(m.get('C')).toBeUndefined()
  })
})

describe('pembungkusan ZIP', () => {
  it('membungkus beberapa ArrayBuffer menjadi satu ZIP yang bisa dibaca kembali', async () => {
    // Tiru cara ExportPanel membungkus: banyak berkas -> satu ZIP.
    const berkas = [
      { nama: 'Lampiran SK - Februari.xlsx', data: new Uint8Array([1, 2, 3, 4]) },
      { nama: 'Lampiran SK - Maret.xlsx', data: new Uint8Array([5, 6, 7, 8, 9]) },
      { nama: 'Rekap - Februari.xlsx', data: new Uint8Array([10, 11]) },
    ]

    const zip = new JSZip()
    for (const b of berkas) zip.file(b.nama, b.data)
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })

    expect(blob.size).toBeGreaterThan(0)

    // Baca kembali untuk memastikan isinya utuh.
    const zipBaca = await JSZip.loadAsync(await blob.arrayBuffer())
    const nama = Object.keys(zipBaca.files).sort()
    expect(nama).toEqual(
      ['Lampiran SK - Februari.xlsx', 'Lampiran SK - Maret.xlsx', 'Rekap - Februari.xlsx'].sort()
    )

    const isi = await zipBaca.file('Lampiran SK - Maret.xlsx')!.async('uint8array')
    expect([...isi]).toEqual([5, 6, 7, 8, 9])
  })

  it('menangani nama berkas berisi spasi, tanda hubung, dan tanda kurung', async () => {
    const zip = new JSZip()
    zip.file('Lampiran SK - Jabar (PIDGI).xlsx', new Uint8Array([1]))
    const blob = await zip.generateAsync({ type: 'blob' })
    const baca = await JSZip.loadAsync(await blob.arrayBuffer())
    expect(Object.keys(baca.files)).toContain('Lampiran SK - Jabar (PIDGI).xlsx')
  })
})

describe('mode keluaran pada model berukuran besar', () => {
  function modelBesar(): SheetModel[] {
    const out: SheetModel[] = []
    const provs = ['ACEH', 'SUMATERA UTARA', 'RIAU', 'JAWA BARAT', 'BALI', 'PAPUA']
    for (const angkatan of [1, 2, 3, 4]) {
      for (const tahun of [2025, 2026]) {
        for (let bulan = 2; bulan <= 5; bulan++) {
          const prov = provs[(angkatan + bulan) % provs.length]
          out.push({
            key: { angkatan, tahun, program: 'PIDI', prov, bulan },
            name: `${angkatan}_${tahun}_${prov}_${bulan}`,
            tabColor: 'C00000',
            lampiran: out.length + 1,
            rows: [{ no: 1, kab: 'K', semula: 'A', wahana: 'W', menjadi: 'B', periodesasi: 'P', tmtKosong: false }],
            sig: ['a', 'b', 'c'],
          })
        }
      }
    }
    return out
  }

  it('mode penuh menghasilkan satu kelompok dengan nomor lampiran berurutan', () => {
    const g = splitSheets(modelBesar(), 'penuh')
    expect(g).toHaveLength(1)
    expect(g[0].sheets.map((s) => s.lampiran)).toEqual(
      Array.from({ length: g[0].sheets.length }, (_, i) => i + 1)
    )
  })

  it('mode bulan mengelompokkan per bulan dan mengulang nomor dari 1', () => {
    const g = splitSheets(modelBesar(), 'bulan')
    expect(g).toHaveLength(4)
    for (const grp of g) {
      expect(grp.sheets.map((s) => s.lampiran)).toEqual(
        Array.from({ length: grp.sheets.length }, (_, i) => i + 1)
      )
      // semua sheet di grup punya bulan yang sama
      const bulan = new Set(grp.sheets.map((s) => s.key.bulan))
      expect(bulan.size).toBe(1)
    }
  })

  it('mode angkatan memisah per angkatan DAN tahun', () => {
    const g = splitSheets(modelBesar(), 'angkatan')
    // 4 angkatan x 2 tahun = 8 kelompok
    expect(g).toHaveLength(8)
    for (const grp of g) {
      const kunci = new Set(grp.sheets.map((s) => `${s.key.angkatan}-${s.key.tahun}`))
      expect(kunci.size).toBe(1)
      expect(grp.sheets.map((s) => s.lampiran)[0]).toBe(1)
    }
  })

  it('total sheet pada semua mode sama dengan jumlah sheet masukan', () => {
    const semua = modelBesar()
    for (const mode of ['penuh', 'bulan', 'angkatan'] as const) {
      const g = splitSheets(semua, mode)
      const total = g.reduce((a, x: OutputGroup) => a + x.sheets.length, 0)
      expect(total, `mode ${mode}`).toBe(semua.length)
    }
  })
})