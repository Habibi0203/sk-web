import { openDB, type IDBPDatabase } from 'idb'

/**
 * Simpan aset yang diperbarui Master di dalam browser (IndexedDB).
 *
 * Sengaja disimpan di perangkat, bukan di server: berkas ini bisa berisi
 * format dokumen internal, jadi tidak boleh keluar dari komputer ini.
 *
 * PENTING: seluruh operasi di modul ini WAJIB gagal dengan cepat, bukan
 * menggantung. IndexedDB bisa tidak pernah menjawab — misalnya pada mode
 * penyamaran, kebijakan privasi browser, atau kuota penuh. Kalau dibiarkan,
 * aplikasi akan macet di status "memuat" tanpa pesan apa pun.
 */

const NAMA_DB = 'sk-web'
const VERSI = 1
const STORE = 'aset'
const BATAS_MS = 2500

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

/** Bungkus operasi apa pun dengan batas waktu, supaya tidak menggantung. */
function denganBatas<T>(p: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`IndexedDB tidak menjawab (${label})`)), BATAS_MS)
    p.then(
      (v) => {
        clearTimeout(t)
        resolve(v)
      },
      (e) => {
        clearTimeout(t)
        reject(e)
      }
    )
  })
}

function db(): Promise<IDBPDatabase> {
  if (!janji) {
    janji = denganBatas(
      openDB(NAMA_DB, VERSI, {
        upgrade(d) {
          if (!d.objectStoreNames.contains(STORE)) {
            d.createObjectStore(STORE, { keyPath: 'kunci' })
          }
        },
      }),
      'buka database'
    ).catch((e) => {
      // Jangan simpan janji yang gagal — biar percobaan berikutnya bisa mencoba lagi.
      janji = null
      throw e
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
  await denganBatas(d.put(STORE, { kunci, nilai, diperbarui }), 'simpan')
  return diperbarui
}

export async function muatAset<K extends KunciAset>(
  kunci: K
): Promise<RekamanAset<SkemaAset[K]> | null> {
  const d = await db()
  const r = (await denganBatas(d.get(STORE, kunci), 'baca')) as
    | RekamanAset<SkemaAset[K]>
    | undefined
  return r ?? null
}

export async function hapusAset(kunci: KunciAset): Promise<void> {
  const d = await db()
  await denganBatas(d.delete(STORE, kunci), 'hapus')
}

export async function kosongkanAset(): Promise<void> {
  const d = await db()
  await denganBatas(d.clear(STORE), 'kosongkan')
}

/** Kapan tiap aset terakhir diperbarui — untuk ditampilkan di UI. */
export async function daftarAset(): Promise<Record<string, string>> {
  const d = await db()
  const semua = (await denganBatas(d.getAll(STORE), 'daftar')) as Array<{
    kunci: string
    diperbarui: string
  }>
  return Object.fromEntries(semua.map((r) => [r.kunci, r.diperbarui]))
}

/** Apakah IndexedDB bisa dipakai di browser ini? Dipakai untuk memberi tahu user. */
export async function idbTersedia(): Promise<boolean> {
  try {
    await db()
    return true
  } catch {
    return false
  }
}