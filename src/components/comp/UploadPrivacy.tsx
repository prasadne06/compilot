import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { getProviderInfo } from '../../services/ai'
import { Modal } from '../ui'

/** The notice shown before someone uploads an offer letter. */
export function UploadNotice({ consented, onConsent }: { consented: boolean; onConsent: (v: boolean) => void }) {
  return (
    <div className="mt-5 rounded-xl border border-ink-200 bg-ink-50/70 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <ShieldCheck className="h-4 w-4 text-pine-600" aria-hidden /> Before you upload
      </p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-600">
        Your offer letter may contain personal details like your name, address and salary. Only upload it if you’re comfortable doing so and your offer allows it.
        We use it only to fill in this form, don’t keep the file, and you can clear the details at any time. Prefer not to? Just enter the numbers yourself.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-sm text-ink-800">
        <input id="upload-consent" type="checkbox" checked={consented} onChange={(e) => onConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 accent-pine-600" />
        I understand, and I want to upload my offer letter
      </label>
      <div className="mt-2 pl-[26px]"><WhatHappensLink /></div>
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
