import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildModel } from '../core/buildModel'
import {
  endDatesDariEntri,
  parseEndDates,
  type EndDateKey,
  type EntriEndDate,
  type Tmt,
} from '../core/dates'
import { muatEndDatesBawaan, muatTemplateBawaan, type EndDatesMeta } from '../core/defaults'
import { bulanDariNamaFile } from '../core/naming'
import { parseDocxParagraphs } from '../core/readDocx'
import { readRawFiles, type RawFileInput } from '../core/readRaw'
import { readTemplate, type TemplateInfo } from '../core/readTemplate'
import { hapusAset, muatAset, simpanAset } from '../storage/assets'
import { bersihkanEdit, terapkanEdit, type EditMap } from '../storage/edits'
import { simpanRiwayat } from '../storage/history'
import { ringkasModel } from '../core/buildModel'
import type { BuildModel } from '../core/types'

export interface RawInput {
  file: File
  tebakanBulan: number | null
  bulan: number | null
}

export type AsalAset = 'bawaan' | 'tersimpan' | 'unggahan'

/** Aset yang dipakai aplikasi: template, tanggal akhir periode, dan teks tanda tangan. */
export interface AsetState {
  template: TemplateInfo | null
  endDates: Map<EndDateKey, Tmt> | null
  endDatesMeta: EndDatesMeta | null
  /** Penimpa teks tanda tangan bila Master menggantinya. */
  sig: string[] | null
  asalTemplate: AsalAset
  asalEndDates: AsalAset
  diperbaruiTemplate: string | null
  diperbaruiEndDates: string | null
  memuat: boolean
  error: string | null
}

export interface PipelineState {
  raw: RawInput[]
  template: File | null
  docx: File | null
  /** Model apa adanya dari hasil pemrosesan. */
  model: BuildModel | null
  /** Model setelah editan manual diterapkan — dipakai untuk pratinjau & ekspor. */
  modelEfektif: BuildModel | null
  /** Peta editan manual. */
  edit: EditMap
  setEditSel: (kunci: string, nilai: string | null) => void
  resetEditSheet: (namaSheet: string) => void
  resetEdit: () => void
  aset: AsetState
  busy: boolean
  error: string | null
  siapProses: boolean
  tambahRaw: (files: FileList | File[]) => void
  hapusRaw: (name: string) => void
  setBulan: (name: string, bulan: number | null) => void
  setTemplateSementara: (f: File | null) => void
  setDocxSementara: (f: File | null) => void
  /** Simpan berkas yang diunggah sebagai aset baru (persisten). */
  perbaruiTemplate: (f: File) => Promise<void>
  perbaruiPeriode: (f: File) => Promise<void>
  perbaruiSig: (sig: string[]) => Promise<void>
  /** Kembalikan ke aset bawaan aplikasi. */
  pulihkan: (kunci: 'template' | 'enddates' | 'sig') => Promise<void>
  proses: () => Promise<void>
  reset: () => void
}

export function usePipeline(): PipelineState {
  const [raw, setRaw] = useState<RawInput[]>([])
  const [template, setTemplateSementara] = useState<File | null>(null)
  const [docx, setDocxSementara] = useState<File | null>(null)
  const [model, setModel] = useState<BuildModel | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditMap>(new Map())

  const [aset, setAset] = useState<AsetState>({
    template: null,
    endDates: null,
    endDatesMeta: null,
    sig: null,
    asalTemplate: 'bawaan',
    asalEndDates: 'bawaan',
    diperbaruiTemplate: null,
    diperbaruiEndDates: null,
    memuat: true,
    error: null,
  })

  // Urutan pemuatan: aset tersimpan di browser -> aset bawaan aplikasi.
  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const [tplTersimpan, edTersimpan, sigTersimpan] = await Promise.all([
          muatAset('template'),
          muatAset('enddates'),
          muatAset('sig'),
        ])

        let tpl: TemplateInfo | null = null
        let asalTpl: AsalAset = 'bawaan'
        let tglTpl: string | null = null
        if (tplTersimpan) {
          tpl = await readTemplate(tplTersimpan.nilai.nama, tplTersimpan.nilai.data)
          asalTpl = 'tersimpan'
          tglTpl = tplTersimpan.diperbarui
        } else {
          tpl = await muatTemplateBawaan()
          asalTpl = 'bawaan'
        }

        let ed: Map<EndDateKey, Tmt> | null = null
        let meta: EndDatesMeta | null = null
        let asalEd: AsalAset = 'bawaan'
        let tglEd: string | null = null
        if (edTersimpan) {
          ed = endDatesDariEntri(edTersimpan.nilai.entri as EntriEndDate[])
          meta = {
            sumber: edTersimpan.nilai.sumber,
            dibuat: edTersimpan.nilai.dibuat,
            catatan: edTersimpan.nilai.catatan,
          }
          asalEd = 'tersimpan'
          tglEd = edTersimpan.diperbarui
        } else {
          const b = await muatEndDatesBawaan()
          ed = b.map
          meta = b.meta
          asalEd = 'bawaan'
        }

        if (batal) return
        setAset({
          template: tpl,
          endDates: ed,
          endDatesMeta: meta,
          sig: sigTersimpan?.nilai ?? null,
          asalTemplate: asalTpl,
          asalEndDates: asalEd,
          diperbaruiTemplate: tglTpl,
          diperbaruiEndDates: tglEd,
          memuat: false,
          error: null,
        })
      } catch (e) {
        if (batal) return
        setAset((s) => ({ ...s, memuat: false, error: e instanceof Error ? e.message : String(e) }))
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  const tambahRaw = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files)
    setRaw((prev) => {
      const ada = new Set(prev.map((r) => r.file.name))
      const baru = arr
        .filter((f) => !ada.has(f.name))
        .map((f) => {
          const tebakan = bulanDariNamaFile(f.name)
          return { file: f, tebakanBulan: tebakan, bulan: tebakan }
        })
      return [...prev, ...baru]
    })
    setModel(null)
  }, [])

  const hapusRaw = useCallback((name: string) => {
    setRaw((prev) => prev.filter((r) => r.file.name !== name))
    setModel(null)
  }, [])

  const setBulan = useCallback((name: string, bulan: number | null) => {
    setRaw((prev) => prev.map((r) => (r.file.name === name ? { ...r, bulan } : r)))
    setModel(null)
  }, [])

  const perbaruiTemplate = useCallback(async (f: File) => {
    const info = await readTemplate(f.name, await f.arrayBuffer())
    const tgl = await simpanAset('template', { nama: f.name, data: await f.arrayBuffer() })
    setAset((s) => ({
      ...s,
      template: info,
      asalTemplate: 'tersimpan',
      diperbaruiTemplate: tgl,
    }))
    setTemplateSementara(null)
    setModel(null)
  }, [])

  const perbaruiPeriode = useCallback(async (f: File) => {
    const paras = await parseDocxParagraphs(await f.arrayBuffer())
    const map = parseEndDates(paras)
    const entri: EntriEndDate[] = [...map].map(([k, v]) => {
      const [angkatan, tahun, program, prov] = k.split('|')
      return {
        angkatan: Number(angkatan),
        tahun: Number(tahun),
        program,
        prov,
        isi: [v[0] ?? null, v[1], v[2]],
      }
    })
    const dibuat = new Date().toISOString().slice(0, 10)
    const tgl = await simpanAset('enddates', {
      sumber: f.name,
      dibuat,
      catatan: `Diperbarui dari berkas ${f.name}`,
      entri,
    })
    setAset((s) => ({
      ...s,
      endDates: map,
      endDatesMeta: { sumber: f.name, dibuat, catatan: `Diperbarui dari berkas ${f.name}` },
      asalEndDates: 'tersimpan',
      diperbaruiEndDates: tgl,
    }))
    setDocxSementara(null)
    setModel(null)
  }, [])

  const perbaruiSig = useCallback(async (sig: string[]) => {
    const tgl = await simpanAset('sig', sig)
    setAset((s) => ({ ...s, sig, diperbaruiTemplate: tgl }))
    setModel(null)
  }, [])

  const pulihkan = useCallback(async (kunci: 'template' | 'enddates' | 'sig') => {
    await hapusAset(kunci)
    if (kunci === 'template') {
      const tpl = await muatTemplateBawaan()
      setAset((s) => ({
        ...s,
        template: tpl,
        asalTemplate: 'bawaan',
        diperbaruiTemplate: null,
      }))
    } else if (kunci === 'enddates') {
      const b = await muatEndDatesBawaan()
      setAset((s) => ({
        ...s,
        endDates: b.map,
        endDatesMeta: b.meta,
        asalEndDates: 'bawaan',
        diperbaruiEndDates: null,
      }))
    } else {
      setAset((s) => ({ ...s, sig: null }))
    }
    setModel(null)
  }, [])

  const siapProses = useMemo(
    () =>
      raw.length > 0 &&
      raw.every((r) => r.bulan !== null) &&
      (template !== null || aset.template !== null) &&
      (docx !== null || aset.endDates !== null),
    [raw, template, docx, aset.template, aset.endDates]
  )

  const proses = useCallback(async () => {
    if (raw.length === 0) return
    setBusy(true)
    setError(null)
    try {
      let tpl: TemplateInfo
      if (template) tpl = await readTemplate(template.name, await template.arrayBuffer())
      else if (aset.template) tpl = aset.template
      else throw new Error('Template belum tersedia.')

      let endDates: Map<EndDateKey, Tmt>
      let sumberPeriode: string
      if (docx) {
        endDates = parseEndDates(await parseDocxParagraphs(await docx.arrayBuffer()))
        sumberPeriode = `${docx.name} (unggahan)`
      } else if (aset.endDates) {
        endDates = aset.endDates
        sumberPeriode = `${aset.endDatesMeta?.sumber ?? 'bawaan'} (${aset.endDatesMeta?.dibuat ?? '-'})`
      } else {
        throw new Error('Data tanggal akhir periode belum tersedia.')
      }

      const inputs: RawFileInput[] = []
      for (const r of raw) {
        inputs.push({ name: r.file.name, data: await r.file.arrayBuffer(), bulan: r.bulan })
      }
      const { rows, skipped, bulanTidakDiketahui } = await readRawFiles(inputs)

      const m = buildModel({
        rows,
        endDates,
        sumberPeriode,
        skipped,
        templateName: tpl.fileName,
        templateSig: aset.sig ?? tpl.sig,
        templateData: tpl.data,
      })
      if (bulanTidakDiketahui.length > 0) {
        setError(`Bulan tidak dikenali untuk: ${bulanTidakDiketahui.join(', ')}`)
      }
      setModel(m)
      setEdit(new Map())

      // Catat riwayat (ringkasan saja — tanpa isi tabel).
      try {
        const r = ringkasModel(m)
        await simpanRiwayat({
          waktu: new Date().toISOString(),
          berkasMentah: raw.map((x) => x.file.name),
          templateNama: tpl.fileName,
          sumberPeriode,
          ...r,
        })
      } catch {
        /* riwayat bersifat tambahan — kegagalan menyimpan tidak boleh menggagalkan proses */
      }
    } catch (e) {
      setModel(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [template, docx, raw, aset])

  const setEditSel = useCallback((kunci: string, nilai: string | null) => {
    setEdit((prev) => {
      // Nilai kosong berarti kembali ke nilai asli -> hapus dari peta.
      if (nilai === null || nilai === '') {
        const next = new Map(prev)
        next.delete(kunci)
        return next
      }
      const next = new Map(prev)
      next.set(kunci, nilai)
      return next
    })
  }, [])

  const resetEditSheet = useCallback((namaSheet: string) => {
    setEdit((prev) => bersihkanEdit(prev, namaSheet))
  }, [])

  const resetEdit = useCallback(() => setEdit(new Map()), [])

  const reset = useCallback(() => {
    setEdit(new Map())
    setRaw([])
    setTemplateSementara(null)
    setDocxSementara(null)
    setModel(null)
    setError(null)
  }, [])

  const modelEfektif = useMemo(() => {
    if (!model) return null
    if (edit.size === 0) return model
    return { ...model, sheets: terapkanEdit(model.sheets, edit) }
  }, [model, edit])

  return {
    raw,
    template,
    docx,
    model,
    modelEfektif,
    edit,
    setEditSel,
    resetEditSheet,
    resetEdit,
    aset,
    busy,
    error,
    siapProses,
    tambahRaw,
    hapusRaw,
    setBulan,
    setTemplateSementara,
    setDocxSementara,
    perbaruiTemplate,
    perbaruiPeriode,
    perbaruiSig,
    pulihkan,
    proses,
    reset,
  }
}
