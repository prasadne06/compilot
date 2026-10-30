import { useMemo, useState } from 'react'
import { clsx } from 'clsx'
import { AlertTriangle, Quote } from 'lucide-react'
import type { AutofillKey, ExtractedField } from '../../types'
import { AUTOFILL_FIELDS, AUTOFILL_ORDER } from '../../data/autofillFields'
import { Button, CurrencyInput, Input, Modal, NumberInput, Select } from '../ui'
import { RatingPill } from './ConfidenceIndicator'

interface Row extends ExtractedField {
  include: boolean
  edited: boolean
}

interface ExtractionReviewProps {
  open: boolean
  fileName: string
  fields: ExtractedField[]
  warnings: string[]
  onCancel: () => void
  onConfirm: (fields: ExtractedField[], pendingKeys: AutofillKey[]) => void
}

function ValueEditor({ row, onChange }: { row: Row; onChange: (v: string | number | undefined) => void }) {
  const meta = AUTOFILL_FIELDS[row.key]
  const id = `review-${row.key}`
  const label = `${meta.label} value`
  switch (meta.kind) {
    case 'money':
      return <CurrencyInput id={id} aria-label={label} value={typeof row.value === 'number' ? row.value : undefined} onValueChange={onChange} suffix={meta.suffix} />
    case 'percent':
    case 'number':
      return <NumberInput id={id} aria-label={label} value={typeof row.value === 'number' ? row.value : undefined} onValueChange={onChange} suffix={meta.suffix} />
    case 'select':
      return <Select id={id} aria-label={label} options={meta.options ?? []} value={String(row.value)} onValueChange={(v) => onChange(v || undefined)} />
    case 'date':
      return <Input id={id} aria-label={label} type="date" value={String(row.value)} onChange={(e) => onChange(e.target.value || undefined)} />
    case 'longtext':
      return (
        <textarea
          id={id}
          aria-label={label}
          rows={2}
          value={String(row.value)}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-[15px] text-ink-900 hover:border-ink-300 focus:border-pine-500 focus:outline-none focus:ring-2 focus:ring-pine-500/30"
        />
      )
    default:
      return <Input id={id} aria-label={label} value={String(row.value)} onChange={(e) => onChange(e.target.value)} />
  }
}

export function ExtractionReview({ open, fileName, fields, warnings, onCancel, onConfirm }: ExtractionReviewProps) {
  const initial = useMemo(
    () =>
      [...fields]
        .sort((a, b) => AUTOFILL_ORDER.indexOf(a.key) - AUTOFILL_ORDER.indexOf(b.key))
        .map((f) => ({ ...f, include: true, edited: false })),
    [fields],
  )
  const [rows, setRows] = useState<Row[]>(initial)
  const update = (key: AutofillKey, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)))

  const selected = rows.filter((r) => r.include && r.value !== undefined && r.value !== '')
  const needsCheck = rows.filter((r) => r.include && r.confidence !== 'high' && !r.edited).length
  const sections = (['About you', 'Your offer'] as const).map((s) => ({ s, rows: rows.filter((r) => AUTOFILL_FIELDS[r.key].section === s) })).filter((g) => g.rows.length)

  const confirm = () => {
    const out: ExtractedField[] = selected.map(({ include: _i, edited: _e, ...f }) => f)
    // Values the user edited here count as checked; uncertain ones stay flagged in the form.
    const pending = selected.filter((r) => r.confidence !== 'high' && !r.edited).map((r) => r.key)
    onConfirm(out, pending)
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      size="lg"
      title="Check the details we found"
      description={`From ${fileName}. Compare each value with your letter, fix anything that’s wrong, and untick anything you don’t want filled in.`}
      footer={
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-ink-500">
            {selected.length} of {rows.length} details selected
            {needsCheck > 0 && <> · {needsCheck} will stay highlighted in the form for you to check</>}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={confirm} disabled={selected.length === 0}>Fill in {selected.length} details</Button>
          </div>
        </div>
      }
    >
      {warnings.length > 0 && (
        <div className="mb-5 space-y-1.5 rounded-xl border border-caution-bd bg-caution-bg/60 px-4 py-3">
          {warnings.map((w) => (
            <p key={w} className="flex gap-2 text-[13px] leading-relaxed text-caution-fg">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {sections.map(({ s, rows: group }) => (
          <section key={s}>
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-400">{s}</h3>
            <ul className="mt-2 divide-y divide-ink-100 rounded-xl border border-ink-200">
              {group.map((r) => {
                const meta = AUTOFILL_FIELDS[r.key]
                return (
                  <li key={r.key} className={clsx('grid gap-3 p-4 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)]', !r.include && 'bg-ink-50/70')}>
                    <div className="flex items-start gap-3">
                      <input
                        id={`include-${r.key}`}
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => update(r.key, { include: e.target.checked })}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-pine-600"
                      />
                      <div className="min-w-0">
                        <label htmlFor={`include-${r.key}`} className="block text-sm font-medium text-ink-900">{meta.label}</label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <RatingPill rating={r.confidence} />
                          {r.edited && <span className="text-[11px] font-medium text-pine-700">Edited</span>}
                        </div>
                      </div>
                    </div>
                    <div className={clsx('min-w-0', !r.include && 'pointer-events-none opacity-50')}>
                      <ValueEditor row={r} onChange={(v) => update(r.key, { value: v ?? '', edited: true })} />
                      <p className="mt-2 flex gap-1.5 text-xs leading-relaxed text-ink-500">
                        <Quote className="mt-0.5 h-3 w-3 shrink-0 text-ink-400" aria-hidden />
                        <span className="min-w-0 break-words italic">{r.evidence}</span>
                      </p>
                      {r.note && <p className="mt-1 text-xs text-caution-fg">{r.note}</p>}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-ink-400">
        Confidence shows how clearly the letter stated each value. Extraction is automatic and can miss or misread details, so your letter is always the source of truth.
      </p>
    </Modal>
  )
}
