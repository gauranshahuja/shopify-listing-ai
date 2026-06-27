import { getDatabase } from '../../db/client.js'

export class MappingsRepository {
  constructor() {
    this.db = getDatabase()
  }

  count() {
    return this.db.prepare('SELECT COUNT(*) as n FROM mappings').get()?.n ?? 0
  }

  countTypeCategory() {
    return this.db.prepare('SELECT COUNT(*) as n FROM type_to_category').get()?.n ?? 0
  }

  findByHandle(handle) {
    return this.db.prepare(
      'SELECT * FROM mappings WHERE lower(handle) = lower(?) LIMIT 1'
    ).get(handle ?? '')
  }

  findByBrandTitle(brand, title) {
    return this.db.prepare(
      'SELECT * FROM mappings WHERE lower(brand) = lower(?) AND lower(title) = lower(?) LIMIT 1'
    ).get(brand ?? '', title ?? '')
  }

  candidatesByTitle(tokens, limit = 60) {
    if (!tokens.length) return []
    const clauses = tokens.map(() => 'lower(title) LIKE ?').join(' OR ')
    const params = tokens.map((t) => `%${t.toLowerCase()}%`)
    return this.db.prepare(
      `SELECT * FROM mappings WHERE ${clauses} LIMIT ?`
    ).all(...params, limit)
  }

  categoryForType(type) {
    return this.db.prepare(
      'SELECT category FROM type_to_category WHERE lower(type) = lower(?)'
    ).get(type ?? '')?.category ?? null
  }

  _typesCache = null
  _allTypes() {
    if (this._typesCache) return this._typesCache
    const rows = this.db.prepare('SELECT DISTINCT type FROM type_to_category').all()
    this._typesCache = rows
      .map((r) => (r.type || '').trim())
      .filter((t) => t.length >= 3)
      .sort((a, b) => b.length - a.length)
    return this._typesCache
  }

  detectTypeFromTitle(title) {
    const t = (title || '').toLowerCase()
    if (!t) return null
    const hits = []
    for (const type of this._allTypes()) {
      const lt = type.toLowerCase()
      const re = new RegExp(`(^|[^a-z0-9])${lt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i')
      if (re.test(t)) hits.push(type)
    }
    if (hits.length === 0) return null
    const isFoodType = (type) => {
      const cat = this.categoryForType(type) || ''
      return /^food, beverages/i.test(cat)
    }
    const nonFood = hits.filter((h) => !isFoodType(h))
    const pool = nonFood.length ? nonFood : hits

    return pool[0]
  }

  upsert({ source, brand, title, handle, type, category, tags, keywords }) {
    this.db.prepare(`
      INSERT INTO mappings (source, brand, title, handle, type, category, tags, keywords)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(handle) DO UPDATE SET
        brand    = excluded.brand,
        title    = excluded.title,
        type     = excluded.type,
        category = excluded.category,
        tags     = excluded.tags,
        keywords = excluded.keywords
    `).run(
      source ?? '', brand ?? '', title ?? '', handle ?? '',
      type ?? '', category ?? '', tags ?? '',
      Array.isArray(keywords) ? JSON.stringify(keywords) : (keywords ?? '[]'),
    )
  }

  bulkUpsert(rows) {
    const stmt = this.db.prepare(`
      INSERT INTO mappings (source, brand, title, handle, type, category, tags, keywords)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(handle) DO UPDATE SET
        brand    = excluded.brand,
        title    = excluded.title,
        type     = excluded.type,
        category = excluded.category,
        tags     = excluded.tags,
        keywords = excluded.keywords
    `)
    const run = this.db.transaction((rows) => {
      for (const r of rows) {
        stmt.run(
          r.source ?? '', r.brand ?? '', r.title ?? '', r.handle ?? '',
          r.type ?? '', r.category ?? '', r.tags ?? '',
          Array.isArray(r.keywords) ? JSON.stringify(r.keywords) : (r.keywords ?? '[]'),
        )
      }
    })
    run(rows)
    return rows.length
  }

  upsertTypeCategory(type, category) {
    this.db.prepare(`
      INSERT INTO type_to_category (type, category) VALUES (?, ?)
      ON CONFLICT(type) DO UPDATE SET category = excluded.category, count = count + 1
    `).run(type ?? '', category ?? '')
  }

  stats() {
    return {
      mappings: this.count(),
      typeCategories: this.countTypeCategory(),
    }
  }
}

let _instance = null
export function getMappingsRepository() {
  if (!_instance) _instance = new MappingsRepository()
  return _instance
}

