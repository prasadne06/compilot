import type { MouseEvent } from 'react'

/**
 * Click handler for in-page anchors (`href="#id"`). Scrolls in code instead of changing the URL hash,
 * which hash-based routing would otherwise treat as a page navigation.
 */
export function scrollToAnchor(id: string, opts: { focus?: boolean } = {}) {
  return (e: MouseEvent) => {
    const el = document.getElementById(id)
    if (!el) return
    e.preventDefault()
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    if (opts.focus) el.focus({ preventScroll: true })
  }
}
