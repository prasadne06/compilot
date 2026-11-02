import { useEffect, useState } from 'react'
import { getProviderInfo, type AIProviderInfo } from '../services/ai/provider'

/** Whether AI features run on Claude (through CompPilot's server) or on built-in rules. */
export function useProviderInfo(): AIProviderInfo | null {
  const [info, setInfo] = useState<AIProviderInfo | null>(null)
  useEffect(() => {
    let live = true
    getProviderInfo().then((i) => live && setInfo(i))
    return () => { live = false }
  }, [])
  return info
}
