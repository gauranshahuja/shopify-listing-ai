import { getMappingsRepository } from './repository.js'
import { tokenize, tokenSet, overlap } from './tokenize.js'

const SCORE_THRESHOLD = 0.35

export function findMatch(product) {
  const repo = getMappingsRepository()
  const { brand = '', title = '', type = '', handle = '' } = product

  const typeCategory = type ? repo.categoryForType(type) : null

  if (handle) {
    const row = repo.findByHandle(handle)
    if (row) return _hit(row, 1.0, typeCategory)
  }

  if (brand && title) {
    const row = repo.findByBrandTitle(brand, title)
    if (row) return _hit(row, 0.98, typeCategory)
  }

  const titleTokens = tokenize(title)
  if (titleTokens.length) {
    const candidates = repo.candidatesByTitle(titleTokens.slice(0, 4))
    const titleSet = tokenSet(title)

    let best = null
    let bestScore = 0

    for (const row of candidates) {
      const rowSet = tokenSet(row.title)
      const score = overlap(titleSet, rowSet)
      if (score > bestScore) {
        bestScore = score
        best = row
      }
    }

    if (best && bestScore >= SCORE_THRESHOLD) {
      return _hit(best, bestScore, typeCategory)
    }
  }

  if (typeCategory) {
    return { category: typeCategory, tags: '', type, matchedHandle: null, score: 0.5 }
  }

  return null
}

function _hit(row, score, typeCategory) {
  return {

    category: typeCategory || row.category || '',
    tags: row.tags || '',
    type: row.type || '',
    matchedHandle: row.handle || null,
    score,
  }
}

