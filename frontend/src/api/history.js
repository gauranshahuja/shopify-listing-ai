import { apiJson, apiFetch, downloadCsv } from './client.js'

export async function fetchHistory({ limit = 200, scope } = {}) {
  const qs = new URLSearchParams()
  qs.set('limit', String(limit))
  if (scope) qs.set('scope', scope)
  return apiJson(`/api/history?${qs.toString()}`)
}

export async function clearMyHistory() {
  return apiJson('/api/history', { method: 'DELETE' })
}

export async function downloadHistoryCsv(id) {
  const resp = await apiFetch(`/api/history/${id}/download`)
  if (!resp.ok) {
    let msg = 'CSV not available (it may have expired after 4 hours).'
    try { const j = await resp.json(); if (j?.error) msg = j.error } catch {}
    throw new Error(msg)
  }
  const csv = await resp.text()
  const cd = resp.headers.get('Content-Disposition') || ''
  const m = cd.match(/filename="([^"]+)"/)
  downloadCsv(csv.replace(/^﻿/, ''), m ? m[1] : `history-${id}.csv`)
}

