import { useCallback, useEffect, useState } from 'react'
import type { AIContext, AIResult } from '../services/ai'

// Session-level cache so revisiting a tab doesn't regenerate the same content.
const cache = new Map<string, AIResult<unknown>>()

interface UseAIState<T> {
  result: AIResult<T> | null
  loading: boolean
  error: string | null
  regenerate: () => void
}

export function useAI<T>(key: string, ctx: AIContext | null, fn: (ctx: AIContext) => Promise<AIResult<T>>): UseAIState<T> {
  const cacheKey = ctx ? `${key}:${JSON.stringify(ctx)}` : null
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<{ key: string | null; result: AIResult<T> | null; error: string | null }>(() => ({
    key: cacheKey,
    result: cacheKey ? ((cache.get(cacheKey) as AIResult<T>) ?? null) : null,
    error: null,
  }))

  useEffect(() => {
    if (!ctx || !cacheKey) return
    const cached = cache.get(cacheKey) as AIResult<T> | undefined
    if (cached && nonce === 0) {
      setState({ key: cacheKey, result: cached, error: null })
      return
    }
    let cancelled = false
    setState({ key: cacheKey, result: null, error: null })
    fn(ctx)
      .then((r) => {
        cache.set(cacheKey, r)
        if (!cancelled) setState({ key: cacheKey, result: r, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ key: cacheKey, result: null, error: e instanceof Error ? e.message : 'Something went wrong' })
      })
    return () => {
      cancelled = true
    }
    // fn is stable per call site; cacheKey captures ctx changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, nonce])

  const regenerate = useCallback(() => {
    if (cacheKey) cache.delete(cacheKey)
    setNonce((n) => n + 1)
  }, [cacheKey])

  const fresh = state.key === cacheKey
  return {
    result: fresh ? state.result : null,
    loading: !!ctx && (!fresh || (!state.result && !state.error)),
    error: fresh ? state.error : null,
    regenerate,
  }
}
