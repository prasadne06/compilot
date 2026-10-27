import { Compass } from 'lucide-react'
import { ButtonLink, EmptyState } from '../components/ui'

export function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <EmptyState icon={<Compass className="h-5 w-5" />} title="Page not found" description="That page doesn’t exist. Let’s get you back on track." action={<ButtonLink to="/">Go home</ButtonLink>} />
    </div>
  )
}
