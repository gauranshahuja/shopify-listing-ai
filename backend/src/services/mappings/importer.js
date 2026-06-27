import { parse } from 'csv-parse/sync'
import { getMappingsRepository } from './repository.js'
import { logger } from '../../utils/logger.js'

const REQUIRED_COLS = ['title']
const COL_ALIASES = {
  handle: ['handle', 'slug', 'url_handle'],
  brand:  ['brand', 'vendor'],
  title:  ['title', 'product_title', 'name'],
  type:   ['type', 'product_type'],
  category: ['category', 'cat'],
  tags:   ['tags', 'tag'],
  keywords: ['keywords', 'keyword'],
  source: ['source', 'src'],
}

function mapHeaders(headers) {
  const lower = headers.map((h) => h.trim().toLowerCase())
  const map = {}
  for (const [field, aliases] of Object.entries(COL_ALIASES)) {
    for (const alias of aliases) {
      const idx = lower.indexOf(alias)
      if (idx !== -1) { map[field] = idx; break }
    }
  }
  return map
}

export function importMappingsCsv(csvData, sourceName = 'upload') {
  const repo = getMappingsRepository()
  const errors = []
  let imported = 0
  let skipped = 0

  let records
  try {
    records = parse(csvData, { columns: true, skip_empty_lines: true, trim: true, bom: true })
  } catch (err) {
    return { imported: 0, skipped: 0, errors: [`CSV parse error: ${err.message}`] }
  }

  if (!records.length) return { imported: 0, skipped: 0, errors: ['CSV has no rows'] }

  const colMap = mapHeaders(Object.keys(records[0]))

  for (const required of REQUIRED_COLS) {
    if (colMap[required] === undefined) {
      return { imported: 0, skipped: 0, errors: [`Missing required column: ${required}`] }
    }
  }

  const rows = []
  for (const [i, rec] of records.entries()) {
    const get = (field) => {
      if (colMap[field] === undefined) return ''
      const key = Object.keys(rec)[colMap[field]]
      return (rec[key] || '').trim()
    }

    const title = get('title')
    if (!title) { skipped++; continue }

    const handle = get('handle') || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    let keywords = get('keywords')
    if (keywords) {
      try { keywords = JSON.parse(keywords) } catch { keywords = keywords.split(/[,;]/).map((k) => k.trim()).filter(Boolean) }
    } else { keywords = [] }

    rows.push({
      source: get('source') || sourceName,
      brand: get('brand'),
      title,
      handle,
      type: get('type'),
      category: get('category'),
      tags: get('tags'),
      keywords,
    })
  }

  try {
    imported = repo.bulkUpsert(rows)

    for (const row of rows) {
      if (row.type && row.category) {
        repo.upsertTypeCategory(row.type, row.category)
      }
    }
  } catch (err) {
    logger.error('Mappings bulk upsert failed:', err.message)
    errors.push(`DB error: ${err.message}`)
  }

  return { imported, skipped, errors }
}

