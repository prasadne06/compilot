import { useRef, useState, type DragEvent } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, FileCheck2, FileText, Lock, Upload } from 'lucide-react'
import type { AutofillKey, ExtractedField, OfferExtraction } from '../../types'
import { ACCEPTED_FILE_TYPES, DocumentReadError, extractDocumentText } from '../../services/documents/textExtraction'
import { extractOfferDetails, getProviderInfo } from '../../services/ai'
import { useEvaluation } from '../../state/EvaluationContext'
import { Button, LoadingState } from '../ui'
import { ExtractionReview } from './ExtractionReview'

type Phase =
  | { name: 'idle' }
  | { name: 'reading'; fileName: string }
  | { name: 'extracting'; fileName: string }
  | { name: 'review'; fileName: string; result: OfferExtraction }
  | { name: 'error'; message: string }

const SAMPLE_PATH = 'samples/sample-offer-letter.pdf'

export function OfferUpload({ compact = false, onApplied }: { compact?: boolean; onApplied?: () => void }) {
  const { autofill, applyAutofill } = useEvaluation()
  const [phase, setPhase] = useState<Phase>({ name: 'idle' })
  const [dragging, setDragging] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const inputRef = useRef<HTMLInputElement>(null)
  const remote = getProviderInfo().mode === 'remote'

  const handleFile = async (file: File) => {
    setPhase({ name: 'reading', fileName: file.name })
    try {
      const { text } = await extractDocumentText(file)
      setPhase({ name: 'extracting', fileName: file.name })
      const { data } = await extractOfferDetails(text)
      if (data.fields.length === 0) {
        setPhase({ name: 'error', message: 'We read the file but couldn’t find offer details in it. Check that it’s your offer letter, or enter the details manually.' })
        return
      }
      setPhase({ name: 'review', fileName: file.name, result: data })
    } catch (err) {
      setPhase({ name: 'error', message: err instanceof DocumentReadError ? err.message : 'Something went wrong while reading this file. Try again, or enter the details manually.' })
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const trySample = async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}${SAMPLE_PATH}`)
      if (!res.ok) throw new Error()
      await handleFile(new File([await res.blob()], 'sample-offer-letter.pdf', { type: 'application/pdf' }))
    } catch {
      setPhase({ name: 'error', message: 'The sample letter couldn’t be loaded. Try uploading your own file.' })
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) void handleFile(f)
  }

  const confirm = (fields: ExtractedField[], pending: AutofillKey[]) => {
    if (phase.name !== 'review') return
    applyAutofill(phase.fileName, fields, pending)
    setPhase({ name: 'idle' })
    setExpanded(false)
    onApplied?.()
  }

  const busy = phase.name === 'reading' || phase.name === 'extracting'
  const fileInput = (
    <input ref={inputRef} id="offer-file" type="file" accept={ACCEPTED_FILE_TYPES} className="sr-only" onChange={(e) => e.target.files?.[0] && void handleFile(e.target.files[0])} />
  )

  // Already filled: show a compact status row
  if (autofill && !expanded && !busy && phase.name !== 'error')
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-pine-200 bg-pine-50/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-sm text-pine-900">
          <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-pine-600" aria-hidden />
          <span>
            Filled <strong className="font-semibold">{autofill.filledKeys.length} details</strong> from <span className="break-all">{autofill.fileName}</span>.
            {autofill.pendingKeys.length > 0 ? ` ${autofill.pendingKeys.length} still need a quick check — they’re highlighted below.` : ' All checked.'}
          </span>
        </p>
        <Button size="sm" variant="secondary" onClick={() => setExpanded(true)}>Upload a different file</Button>
      </div>
    )

  // Compact entry point (offer step): a single row that expands into the dropzone
  if (!expanded && !busy && phase.name !== 'error')
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-ink-200 bg-white px-4 py-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2.5 text-sm text-ink-700">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-ink-500" aria-hidden />
          Have your offer letter? Upload it and we’ll fill in these fields for you to check.
        </p>
        <Button size="sm" variant="secondary" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => setExpanded(true)}>Upload offer letter</Button>
      </div>
    )

  return (
    <section aria-label="Upload your offer letter" className="rounded-2xl border border-ink-200/80 bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink-900">Start from your offer letter</h2>
          <p className="mt-1 text-[13px] text-ink-500">Optional. We’ll read it and fill in what we find, then you check every detail before anything is used.</p>
        </div>
        {autofill && <Button size="sm" variant="ghost" onClick={() => { setExpanded(false); setPhase({ name: 'idle' }) }}>Close</Button>}
      </div>

      {busy ? (
        <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50/60 p-5">
          <LoadingState label={phase.name === 'reading' ? `Reading ${phase.fileName}…` : 'Finding offer details…'} lines={3} />
        </div>
      ) : (
        <label
          htmlFor="offer-file"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx(
            'mt-5 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus-within:ring-2 focus-within:ring-pine-500',
            dragging ? 'border-pine-500 bg-pine-50' : 'border-ink-200 bg-ink-50/50 hover:border-ink-300 hover:bg-ink-50',
          )}
        >
          {fileInput}
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-ink-700 shadow-card ring-1 ring-ink-200"><Upload className="h-4 w-4" aria-hidden /></span>
          <span className="mt-3 text-sm font-medium text-ink-900">Drop your offer letter here, or <span className="text-pine-700 underline underline-offset-4">choose a file</span></span>
          <span className="mt-1 text-xs text-ink-500">PDF or Word (.docx), up to 10 MB</span>
        </label>
      )}

      {phase.name === 'error' && (
        <div role="alert" className="mt-4 flex gap-2.5 rounded-xl border border-critical-bd bg-critical-bg px-4 py-3 text-sm text-critical-fg">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{phase.message}</p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-1.5">
          <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
          {remote
            ? 'Your file is read in your browser. Only its text is sent to the configured AI service to find the details.'
            : 'Your file is read in your browser and never uploaded anywhere.'}
        </p>
        <button type="button" onClick={trySample} disabled={busy} className="shrink-0 self-start font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900 disabled:opacity-50 sm:self-auto">
          No letter handy? Try a sample
        </button>
      </div>

      {phase.name === 'review' && (
        <ExtractionReview open fileName={phase.fileName} fields={phase.result.fields} warnings={phase.result.warnings} onCancel={() => setPhase({ name: 'idle' })} onConfirm={confirm} />
      )}
    </section>
  )
}
