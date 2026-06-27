import { apiFetch } from './client.js'

export async function processCsv(file) {
  const form = new FormData()
  form.append('file', file)
  const resp = await apiFetch('/api/csv/process', { method: 'POST', body: form })

  let data = null
  try { data = await resp.json() } catch {}
  if (!data) throw new Error('Empty response from server')
  if (!resp.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${resp.status}`)
    err.status = resp.status
    throw err
  }
  return data
}

