import { useEffect, useState } from 'react'
import { fetchHealth } from '../api/health.js'

const defaultHealth = {
  ok: false,
  ai: { enabled: false, model: 'gemini-2.5-flash' },
  sheets: { raw: false, processed: false },
  amazon: { configured: false },
  firebase: { configured: false },
}

export function useHealth(enabled = true) {
  const [health, setHealth] = useState(defaultHealth)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetchHealth()
      .then((data) => { if (!cancelled) setHealth({ ...defaultHealth, ...data }) })
      .catch(() => { if (!cancelled) setHealth(defaultHealth) })
    return () => { cancelled = true }
  }, [enabled])
  return { health }
}

