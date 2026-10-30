import type { AutofillKey } from '../types'
import { useEvaluation } from './EvaluationContext'

/** Per-field autofill status for form highlighting, plus pending keys for a form section. */
export function useAutofill(section: 'profile' | 'offer') {
  const { autofill, confirmAutofill } = useEvaluation()
  const status = (key: AutofillKey): 'pending' | 'filled' | undefined =>
    !autofill?.filledKeys.includes(key) ? undefined : autofill.pendingKeys.includes(key) ? 'pending' : 'filled'
  const pending = (autofill?.pendingKeys ?? []).filter((k) => k.startsWith(`${section}.`))
  return { autofill, status, pending, confirmSection: () => confirmAutofill(pending) }
}
