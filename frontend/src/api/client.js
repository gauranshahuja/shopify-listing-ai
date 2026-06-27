import { signOut } from 'firebase/auth'
import { firebaseAuth, getIdToken } from '../lib/firebase.js'

export const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
export const assetPath = (n) => `${import.meta.env.BASE_URL}assets/${n}`

let onUnauthorized = null
export function setOnUnauthorized(fn) { onUnauthorized = fn }

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {})
  const token = await getIdToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const resp = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (resp.status === 401) {
    try { await signOut(firebaseAuth) } catch {}
    if (onUnauthorized) onUnauthorized()
  }
  return resp
}
export async function apiJson(path, options = {}) {
  const resp = await apiFetch(path, options)

  let data = null
  try {
    data = await resp.json()
  } catch {}

  if (!data) {
    throw new Error(`Empty or invalid JSON response from ${path}`)
  }

  if (!resp.ok || data?.ok === false) {
    const err = new Error(data?.error || `HTTP ${resp.status}`)
    err.status = resp.status
    err.data = data
    throw err
  }

  return data
}

export function downloadCsv(csv, fileName) {
  if (!csv) return
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName || 'download.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

