import { useCallback, useMemo, useState } from 'react'
import { buildModel } from '../core/buildModel'
import { bulanDariNamaFile } from '../core/naming'
import { parseDocxParagraphs } from '../core/readDocx'
import { readRawFiles, type RawFileInput } from '../core/readRaw'
import { readTemplate, type TemplateInfo } from '../core/readTemplate'
import type { BuildModel } from '../core/types'

export interface RawInput {
  file: File
  /** Bulan hasil tebakan dari nama berkas; null bila tidak dikenali. */
  tebakanBulan: number | null
  /** Bulan yang dipakai (bisa dikoreksi user). */
  bulan: number | null
}

export interface PipelineState {
  raw: RawInput[]
  template: File | null
  docx: File | null
  model: BuildModel | null
  templateInfo: TemplateInfo | null
  busy: boolean
  error: string | null
  /** true bila semua berkas wajib sudah ada dan bulan tiap berkas mentah sudah pasti. */
  siapProses: boolean
  tambahRaw: (files: FileList | File[]) => void
  hapusRaw: (name: string) => void
  setBulan: (name: string, bulan: number | null) => void
  setTemplate: (f: File | null) => void
  setDocx: (f: File | null) => void
  proses: () => Promise<void>
  reset: () => void
}

export function usePipeline(): PipelineState {
  const [raw, setRaw] = useState<RawInput[]>([])
  const [template, setTemplateFile] = useState<File | null>(null)
  const [docx, setDocxFile] = useState<File | null>(null)
  const [model, setModel] = useState<BuildModel | null>(null)
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  const setTemplate = useCallback((f: File | null) => {
    setTemplateFile(f)
    setTemplateInfo(null)
    setModel(null)
  }, [])

  const setDocx = useCallback((f: File | null) => {
    setDocxFile(f)
    setModel(null)
  }, [])

  const siapProses = useMemo(
    () =>
      raw.length > 0 &&
      raw.every((r) => r.bulan !== null) &&
      template !== null &&
      docx !== null,
    [raw, template, docx]
  )

  const proses = useCallback(async () => {
    if (!template || !docx || raw.length === 0) return
    setBusy(true)
    setError(null)
    try {
      const tplInfo = await readTemplate(template.name, await template.arrayBuffer())
      setTemplateInfo(tplInfo)

      const inputs: RawFileInput[] = []
      for (const r of raw) {
        inputs.push({ name: r.file.name, data: await r.file.arrayBuffer(), bulan: r.bulan })
      }
      const { rows, skipped, bulanTidakDiketahui } = await readRawFiles(inputs)

      const paragraphs = await parseDocxParagraphs(await docx.arrayBuffer())

      const m = buildModel({
        rows,
        paragraphs,
        skipped,
        templateName: template.name,
        templateSig: tplInfo.sig,
      })
      if (bulanTidakDiketahui.length > 0) {
        setError(`Bulan tidak dikenali untuk: ${bulanTidakDiketahui.join(', ')}`)
      }
      setModel(m)
    } catch (e) {
      setModel(null)
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }, [template, docx, raw])

  const reset = useCallback(() => {
    setRaw([])
    setTemplateFile(null)
    setDocxFile(null)
    setModel(null)
    setTemplateInfo(null)
    setError(null)
  }, [])

  return {
    raw,
    template,
    docx,
    model,
    templateInfo,
    busy,
    error,
    siapProses,
    tambahRaw,
    hapusRaw,
    setBulan,
    setTemplate,
    setDocx,
    proses,
    reset,
  }
}
