import type { CoachMessage } from '../services/ai/agent'

// Coach conversations are saved per offer, in this browser only.
const STORAGE_KEY = 'comppilot:coach:v2'
const LEGACY_KEY = 'comppilot:coach:v1'
const MAX_OFFERS = 8
const MAX_MESSAGES = 40

type Store = Record<string, { messages: CoachMessage[]; at: number }>

function read(): Store {
  try {
    localStorage.removeItem(LEGACY_KEY) // the old single conversation wasn't tied to an offer
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Store
  } catch {
    return {}
  }
}

export function loadConversation(offerKey: string): CoachMessage[] {
  const messages = read()[offerKey]?.messages ?? []
  // A reply that was mid-stream when the page closed is shown as stopped
  return messages.map((m) => (m.status === 'thinking' || m.status === 'streaming' ? { ...m, status: 'stopped' } : m))
}

export function saveConversation(offerKey: string, messages: CoachMessage[]) {
  try {
    const store = read()
    if (messages.length) store[offerKey] = { messages: messages.slice(-MAX_MESSAGES), at: Date.now() }
    else delete store[offerKey]
    // Keep only the most recent offers
    const kept = Object.entries(store).sort((a, b) => b[1].at - a[1].at).slice(0, MAX_OFFERS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)))
  } catch {
    /* storage unavailable: the conversation just won't be restored */
  }
}
