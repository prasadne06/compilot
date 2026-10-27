import { Outlet, useLocation } from 'react-router-dom'
import { ProgressStepper } from '../components/ui'

export const EVAL_STEPS = [
  { label: 'About you', path: '/evaluate/about-you' },
  { label: 'Your offer', path: '/evaluate/offer' },
  { label: 'Leverage & priorities', path: '/evaluate/priorities' },
  { label: 'Evaluation', path: '/results' },
]

export function EvaluateLayout() {
  const { pathname } = useLocation()
  const current = Math.max(0, EVAL_STEPS.findIndex((s) => pathname.startsWith(s.path)))
  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <ProgressStepper steps={EVAL_STEPS} current={current} />
      <div className="mt-8 sm:mt-10">
        <Outlet />
      </div>
    </div>
  )
}
