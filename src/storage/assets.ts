import { openDB, type IDBPDatabase } from 'idb'

/**
 * Simpan aset yang diperbarui Master di dalam browser (IndexedDB).
 *
 * Sengaja disimpan di perangkat, bukan di server: berkas ini bisa berisi
 * format dokumen internal, jadi tidak boleh keluar dari komputer ini.
 */

const NAMA_DB = 'sk-web'
const VERSI = 1
const STORE = 'aset'

export type KunciAset = 'template' | 'enddates' | 'sig'

export interface RekamanAset<T> {
  kunci: KunciAset
  nilai: T
  diperbarui: string
}

interface SkemaAset {
  template: { nama: string; data: ArrayBuffer }
  enddates: { sumber: string; dibuat: string; catatan: string; entri: unknown[] }
  sig: string[]
}

let janji: Promise<IDBPDatabase> | null = null

function db(): Promise<IDBPDatabase> {
  if (!janji) {
    janji = openDB(NAMA_DB, VERSI, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'kunci' })
        }
      },
    })
  }
  return janji
}

export async function simpanAset<K extends KunciAset>(
  kunci: K,
  nilai: SkemaAset[K]
): Promise<string> {
  const d = await db()
  const diperbarui = new Date().toISOString()
  await d.put(STORE, { kunci, nilai, diperbarui })
  return diperbarui
}

export async function muatAset<K extends KunciAset>(
  kunci: K
): Promise<RekamanAset<SkemaAset[K]> | null> {
  const d = await db()
  const r = (await d.get(STORE, kunci)) as RekamanAset<SkemaAset[K]> | undefined
  return r ?? null
}

export async function hapusAset(kunci: KunciAset): Promise<void> {
  const d = await db()
  await d.delete(STORE, kunci)
}

export async function kosongkanAset(): Promise<void> {
  const d = await db()
  await d.clear(STORE)
}

/** Kapan tiap aset terakhir diperbarui — untuk ditampilkan di UI. */
export async function daftarAset(): Promise<Record<string, string>> {
  const d = await db()
  const semua = (await d.getAll(STORE)) as Array<{ kunci: string; diperbarui: string }>
  return Object.fromEntries(semua.map((r) => [r.kunci, r.diperbarui]))
}
