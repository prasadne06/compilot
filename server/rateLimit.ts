// A small fixed-window limiter kept in memory. On serverless hosts each instance has its own
// counts, so this only slows down abuse; set a spend limit in the Anthropic Console as well.

const hits = new Map<string, { start: number; count: number }>()

export function allow(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const h = hits.get(key)
  if (!h || now - h.start >= windowMs) {
    hits.set(key, { start: now, count: 1 })
    if (hits.size > 10_000) for (const [k, v] of hits) if (now - v.start >= windowMs) hits.delete(k)
    return true
  }
  h.count += 1
  return h.count <= max
}

export function clientKey(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local'
}

export function resetRateLimits() {
  hits.clear()
}
