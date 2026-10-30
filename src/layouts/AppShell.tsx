import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { clsx } from 'clsx'
import { Settings } from 'lucide-react'
import { Logo } from './Logo'
import { scrollToAnchor } from '../lib/scroll'
import { useEvaluation } from '../state/EvaluationContext'

export function AppShell() {
  const { pathname } = useLocation()
  const { ready } = useEvaluation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  const link = ({ isActive }: { isActive: boolean }) =>
    clsx('rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors sm:px-3', isActive ? 'text-ink-900 bg-ink-100' : 'text-ink-500 hover:text-ink-900')

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" onClick={scrollToAnchor('main', { focus: true })} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-ink-50/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Logo />
          <nav className="flex items-center gap-0 sm:gap-1" aria-label="Main">
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/evaluate" className={link}>Evaluate</NavLink>
            {ready && <NavLink to="/results" className={link}>Results</NavLink>}
            <NavLink to="/settings" className={link} aria-label="Settings">
              <Settings className="h-4 w-4" />
            </NavLink>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      <footer className="border-t border-ink-200/70">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>CompPilot provides decision support, not financial advice. Benchmarks are illustrative.</p>
          <p>Your inputs stay in this browser.</p>
        </div>
      </footer>
    </div>
  )
}
