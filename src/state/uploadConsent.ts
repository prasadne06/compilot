import { useState } from 'react'

// Remembers, in this browser only, that the user accepted the offer-letter upload notice.
const KEY = 'comppilot:upload-consent:v1'

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === 'yes'
  } catch {
    return false
  }
}

export function useUploadConsent(): [boolean, (v: boolean) => void] {
  const [consented, setConsented] = useState(read)
  const set = (v: boolean) => {
    setConsented(v)
    try {
      if (v) localStorage.setItem(KEY, 'yes')
      else localStorage.removeItem(KEY)
    } catch {
      /* storage unavailable: ask again next time */
    }
  }
  return [consented, set]
}
