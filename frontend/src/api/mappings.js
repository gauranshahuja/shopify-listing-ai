import { apiJson, apiFetch } from './client.js'

export function getMappingsStats() {
  return apiJson('/api/mappings/stats')
}

export async function importMappings(file, sourceName = '') {
  const form = new FormData()
  form.append('file', file)
  if (sourceName) form.append('source', sourceName)
  const resp = await apiFetch('/api/mappings/import', { method: 'POST', body: form })
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

