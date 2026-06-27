import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { logger } from '../../utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const DATA_PATH = join(__dirname, '..', '..', '..', 'data', 'shopify-categories.txt')

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'for', 'with', 'of', 'to', 'in', 'on',
  'set', 'pack', 'kit', 'combo', 'new', 'pro', 'plus', 'premium', 'best',
  'product', 'products', 'item', 'items', 'free', 'size', 'pcs', 'pc',
])

let _categories = null

function tokenize(str) {
  return (str || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
}

function parseFile(text) {
  const out = []
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const sep = line.indexOf(' : ')
    if (sep === -1) continue
    const gid = line.slice(0, sep).trim()
    const fullName = line.slice(sep + 3).trim()
    if (!fullName) continue
    const parts = fullName.split('>').map((s) => s.trim())
    const leaf = parts[parts.length - 1]

    const leafTokens = new Set(tokenize(parts.slice(-2).join(' ')))
    const pathTokens = new Set(tokenize(parts.join(' ')))
    out.push({ gid, fullName, leaf, tokens: leafTokens, pathTokens })
  }
  return out
}

export function getCategories() {
  if (_categories) return _categories
  let text
  try {
    text = readFileSync(DATA_PATH, 'utf8')
  } catch (err) {
    const e = new Error(
      `Taxonomy data file not found at ${DATA_PATH}. ` +
      `Copy dist/en/categories.txt from shopify/product-taxonomy into backend/data/shopify-categories.txt.`
    )
    e.code = 500
    e.cause = err
    throw e
  }
  _categories = parseFile(text)
  logger.info(`[Taxonomy] loaded ${_categories.length} categories`)
  return _categories
}

export function shortlistCategories(title, limit = 12) {
  const titleTokens = tokenize(title)
  if (titleTokens.length === 0) return []
  const want = new Set(titleTokens)

  const scored = []
  for (const cat of getCategories()) {
    let leafScore = 0, pathScore = 0

    for (const t of cat.tokens) if (want.has(t)) leafScore += 3
    const path = cat.pathTokens || cat.tokens
    for (const t of path) if (want.has(t) && !cat.tokens.has(t)) pathScore += 1
    const score = leafScore + pathScore

    // Keep any category with ANY token overlap (leaf OR path), not just leaf
    // matches. This widens the candidate pool so the model still gets relevant
    // options when the exact leaf word isn't in the title (e.g. "Eau De Parfum"
    // → "Perfume"). Leaf matches still rank highest via the score.
    if (score > 0) scored.push({ cat, score, leafScore })
  }

  scored.sort((a, b) =>
    b.score - a.score ||
    b.leafScore - a.leafScore ||
    a.cat.fullName.length - b.cat.fullName.length
  )
  return scored.slice(0, limit).map((s) => s.cat)
}

export function findByFullName(fullName) {
  if (!fullName) return null
  const target = fullName.trim()
  return getCategories().find((c) => c.fullName === target) || null
}

export function leafOf(fullName) {
  if (!fullName) return ''
  return fullName.split('>').pop().trim()
}

