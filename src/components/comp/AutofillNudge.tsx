import { FileCheck2 } from 'lucide-react'
import { Button } from '../ui'

/** Shown when someone tries to continue with autofilled fields they haven't checked yet. */
export function AutofillNudge({ count, onConfirm }: { count: number; onConfirm: () => void }) {
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-2xl border border-caution-bd bg-caution-bg px-4 py-3.5 animate-fadeUp sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2.5 text-sm text-caution-fg">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>
          <strong className="font-semibold">{count} {count === 1 ? 'detail' : 'details'} from your letter still {count === 1 ? 'needs' : 'need'} checking.</strong> Compare the highlighted fields with your letter and edit anything that’s wrong.
        </span>
      </p>
      <Button size="sm" variant="secondary" onClick={onConfirm} className="shrink-0">They’re correct</Button>
    </div>
  )
}
