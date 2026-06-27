import { getDatabase } from '../db/client.js'

const CSV_TTL_MS = 4 * 60 * 60 * 1000

export class HistoryService {
  constructor() { this.db = getDatabase() }

  add({ userId, mode, host, handle = null, vendor = null, productCount = 0, variantCount = 0, imageCount = 0, durationMs = null, csv = null }) {
    const expiresAt = csv ? new Date(Date.now() + CSV_TTL_MS).toISOString() : null
    const r = this.db.prepare(`
      INSERT INTO history (user_id, mode, host, handle, vendor, product_count, variant_count, image_count, duration_ms, csv, csv_expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId || null,
      mode,
      host,
      handle || null,
      vendor || null,
      productCount,
      variantCount,
      imageCount,
      durationMs || null,
      csv || null,
      expiresAt,
    )
    return r.lastInsertRowid
  }

  list({ userId = null, limit = 200, scope = 'me' } = {}) {
    this.cleanupExpired()
    const cols = `
      h.id, h.user_id, h.mode, h.host, h.handle, h.vendor,
      h.product_count, h.variant_count, h.image_count, h.duration_ms,
      h.created_at, h.csv_expires_at,
      (h.csv IS NOT NULL AND (h.csv_expires_at IS NULL OR h.csv_expires_at > datetime('now'))) AS downloadable
    `
    if (scope === 'all') {
      return this.db.prepare(`
        SELECT ${cols}, u.email AS user_email
        FROM history h LEFT JOIN users u ON h.user_id = u.id
        ORDER BY h.created_at DESC LIMIT ?
      `).all(limit)
    }

    return this.db.prepare(`
      SELECT ${cols}, u.email AS user_email
      FROM history h LEFT JOIN users u ON h.user_id = u.id
      WHERE h.user_id = ?
      ORDER BY h.created_at DESC LIMIT ?
    `).all(userId, limit)
  }

  getDownload(id, { userId, isOwner = false } = {}) {
    const row = this.db.prepare('SELECT * FROM history WHERE id = ?').get(id)
    if (!row) return null
    if (!isOwner && row.user_id !== userId) return null
    if (!row.csv) return null
    if (row.csv_expires_at && new Date(row.csv_expires_at).getTime() < Date.now()) return null
    const safeHost = (row.host || 'catalog').replace(/[^a-z0-9]+/gi, '-')
    return { csv: row.csv, fileName: `${safeHost}-${row.id}.csv` }
  }

  cleanupExpired() {
    return this.db.prepare(
      `UPDATE history SET csv = NULL WHERE csv IS NOT NULL AND csv_expires_at IS NOT NULL AND csv_expires_at <= datetime('now')`
    ).run().changes
  }

  clearForUser(userId) {
    return this.db.prepare('DELETE FROM history WHERE user_id = ?').run(userId).changes
  }
}

let _instance = null
export function getHistoryService() {
  if (!_instance) _instance = new HistoryService()
  return _instance
}

