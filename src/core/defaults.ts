import { endDateKey, type EndDateKey, type Tmt } from './dates'
import { readTemplate, type TemplateInfo } from './readTemplate'

/**
 * Aset bawaan yang ikut bersama aplikasi, supaya Master tidak perlu mengunggah
 * ulang template dan rekapitulasi periode setiap kali memakai aplikasi.
 *
 * Berkasnya diletakkan di `public/` sehingga disajikan apa adanya (tidak ikut
 * menggembungkan bundel JavaScript) dan bisa diganti lewat menu unggah.
 */

export const TEMPLATE_BAWAAN = 'template-default.xlsx'
export const ENDDATES_BAWAAN = 'enddates-default.json'

export interface EndDatesMeta {
  sumber: string
  dibuat: string
  catatan: string
}

export interface EndDatesSumber {
  meta: EndDatesMeta
  map: Map<EndDateKey, Tmt>
}

interface EntriJson {
  angkatan: number
  tahun: number
  program: string
  prov: string
  isi: [number | null, number, number]
}

/** Alamat aset yang benar baik saat di-host di root maupun di sub-path. */
function assetUrl(nama: string): string {
  const base = (import.meta.env.BASE_URL ?? './') as string
  return base.endsWith('/') ? base + nama : `${base}/${nama}`
}

export async function muatTemplateBawaan(): Promise<TemplateInfo> {
  const res = await fetch(assetUrl(TEMPLATE_BAWAAN))
  if (!res.ok) {
    throw new Error(`Berkas template bawaan tidak tersedia (HTTP ${res.status})`)
  }
  return readTemplate(TEMPLATE_BAWAAN, await res.arrayBuffer())
}

export async function muatEndDatesBawaan(): Promise<EndDatesSumber> {
  const res = await fetch(assetUrl(ENDDATES_BAWAAN))
  if (!res.ok) {
    throw new Error(`Data tanggal akhir bawaan tidak tersedia (HTTP ${res.status})`)
  }
  const json = (await res.json()) as { sumber: string; dibuat: string; catatan: string; entri: EntriJson[] }

  const map = new Map<EndDateKey, Tmt>()
  for (const e of json.entri) {
    const tmt: Tmt = [e.isi[0] ?? undefined, e.isi[1], e.isi[2]]
    map.set(endDateKey(e.angkatan, e.tahun, e.program, e.prov), tmt)
  }

  return {
    meta: { sumber: json.sumber, dibuat: json.dibuat, catatan: json.catatan },
    map,
  }
}
