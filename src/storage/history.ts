import { openDB, type IDBPDatabase } from 'idb'

/**
 * Riwayat pemrosesan — RINGKASAN SAJA.
 *
 * Sengaja hanya menyimpan statistik (nama sheet, jumlah baris, jumlah anomali),
 * TIDAK menyimpan isi tabel, karena isinya memuat nama dokter dan nomor STR.
 * Dengan begitu data pribadi tidak menetap di penyimpanan browser.
 */

const NAMA_DB = 'sk-web'
const VERSI = 1
const STORE = 'riwayat'
const MAKS = 10

export interface RingkasanSheet {
  nama: string
  baris: number
  program: string
  provinsi: string
  angkatan: number
  tahun: number
  bulan: number
}

export interface Riwayat {
  id?: number
  waktu: string
  berkasMentah: string[]
  templateNama: string
  sumberPeriode: string
  jumlahSheet: number
  jumlahBaris: number
  jumlahAnomali: number
  anomaliPerJenis: Record<string, number>
  sheets: RingkasanSheet[]
}

let janji: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (!janji) {
    janji = openDB(NAMA_DB, VERSI, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        }
      },
    })
  }
  return janji
}

export async function simpanRiwayat(r: Omit<Riwayat, 'id'>): Promise<number> {
  const d = await db()
  const id = (await d.add(STORE, r)) as number
  await pangkas(d)
  return id
}

export async function daftarRiwayat(): Promise<Riwayat[]> {
  const d = await db()
  const semua = (await d.getAll(STORE)) as Riwayat[]
  return semua.sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
}

export async function hapusRiwayat(id: number): Promise<void> {
  const d = await db()
  await d.delete(STORE, id)
}

export async function kosongkanRiwayat(): Promise<void> {
  const d = await db()
  await d.clear(STORE)
}

/** Simpan hanya N catatan terakhir. */
async function pangkas(d: IDBPDatabase): Promise<void> {
  const semua = (await d.getAll(STORE)) as Riwayat[]
  if (semua.length <= MAKS) return
  const urut = semua.sort((a, b) => (a.waktu < b.waktu ? 1 : -1))
  for (const r of urut.slice(MAKS)) {
    if (r.id !== undefined) await d.delete(STORE, r.id)
  }
}

/** Perkiraan ruang yang dipakai, untuk ditampilkan di UI. */
export async function perkiraanRuang(): Promise<{ pakai: number; kuota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const e = await navigator.storage.estimate()
  return { pakai: e.usage ?? 0, kuota: e.quota ?? 0 }
}

export const MAKS_RIWAYAT = MAKS