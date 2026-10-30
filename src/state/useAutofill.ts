import type { AutofillKey } from '../types'
import type { FieldAutofill } from '../components/ui'
import { useEvaluation } from './EvaluationContext'

/** Autofill state for one form section: per-field source and actions, plus what's still unconfirmed. */
export function useAutofill(section: 'profile' | 'offer') {
  const { autofill, confirmAutofill, clearAutofilledField } = useEvaluation()
  const inSection = (k: AutofillKey) => k.startsWith(`${section}.`)
  const filled = (autofill?.filledKeys ?? []).filter(inSection)
  const pending = (autofill?.pendingKeys ?? []).filter(inSection)

  const field = (key: AutofillKey): FieldAutofill | undefined => {
    if (!autofill?.filledKeys.includes(key)) return undefined
    const src = autofill.sources[key]
    return {
      status: autofill.pendingKeys.includes(key) ? 'pending' : 'confirmed',
      evidence: src?.evidence,
      confidence: src?.confidence,
      note: src?.note,
      onConfirm: () => confirmAutofill([key]),
      onClear: () => clearAutofilledField(key),
    }
  }

  return { autofill, filled, pending, field, confirmSection: () => confirmAutofill(pending) }
}
