import { useState } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '../../lib/cn'
import { getProviderInfo } from '../../services/ai'
import { Modal } from '../ui'

/** The notice shown before someone uploads an offer letter: amber until accepted, green after. */
export function UploadNotice({ consented, onConsent }: { consented: boolean; onConsent: (v: boolean) => void }) {
  const Icon = consented ? ShieldCheck : ShieldAlert
  return (
    <div
      role="region"
      aria-label="Before you upload"
      className={cn('mt-5 rounded-xl border-2 p-4 transition-colors', consented ? 'border-pine-200 bg-pine-50/60' : 'border-caution-bd bg-caution-bg')}
    >
      <p className={cn('flex items-center gap-2 text-sm font-semibold', consented ? 'text-pine-800' : 'text-caution-fg')}>
        <Icon className="h-[18px] w-[18px]" aria-hidden /> Before you upload
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-700">
        Your offer letter may contain <strong className="font-semibold text-ink-900">personal details like your name, address and salary</strong>. Only upload it if
        you’re comfortable doing so and your offer allows it. We use it only to fill in this form, don’t keep the file, and you can clear the details at any time.
        Prefer not to? Just enter the numbers yourself.
      </p>
      <label
        className={cn(
          'mt-3 flex cursor-pointer items-start gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-sm font-medium transition-colors',
          consented ? 'border-pine-300 text-pine-900' : 'border-caution-bd text-ink-900 hover:border-caution-fg/50',
        )}
      >
        <input id="upload-consent" type="checkbox" checked={consented} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-pine-600" />
        <span>
          I understand, and I want to upload my offer letter
          {consented && <span className="mt-0.5 block text-xs font-normal text-pine-700">Thanks. Upload is unlocked below.</span>}
        </span>
      </label>
      <div className="mt-2.5"><WhatHappensLink /></div>
    </div>
  )
}

/** Explains, step by step, what happens to an uploaded file. */
export function WhatHappensLink() {
  const [open, setOpen] = useState(false)
  const remote = getProviderInfo().mode === 'remote'
  const steps = [
    'Your file is opened and read in your browser, on your device.',
    remote
      ? 'Personal details (names, email, phone, street address, ID numbers) are removed, and only the remaining text is sent to our AI provider to find the offer details. The file itself is never sent.'
      : 'The offer details are found on your device. Nothing is sent to a server or an AI service.',
    'The file and its full text aren’t kept. Only the values you confirm are saved, in this browser.',
    'Next to each filled value, we keep the sentence it came from (with personal details removed) so you can check it.',
    'You can clear any value, upload a different file, or remove everything in Settings → Clear my data.',
  ]
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-ink-600 underline decoration-ink-300 underline-offset-4 hover:text-ink-900">
        What happens to my file?
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="What happens to your offer letter" description="CompPilot is built to keep your details private.">
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={s} className="flex gap-3 text-sm leading-relaxed text-ink-700">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pine-50 text-[11px] font-semibold text-pine-700 ring-1 ring-pine-200">{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-ink-500">Uploading is optional. You can always enter the details yourself instead.</p>
      </Modal>
    </>
  )
}
