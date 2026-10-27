import { Link } from 'react-router-dom'

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 rounded-md" aria-label="CompPilot home">
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden>
        <rect width="32" height="32" rx="8" fill="#171612" />
        <path d="M9 21l5-10 4 7 2-3 3 6" fill="none" stroke="#78b7a2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-ink-900">CompPilot</span>
    </Link>
  )
}
