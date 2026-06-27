import { env } from '../../config/env.js'
import { logger } from '../../utils/logger.js'
import { shortlistCategories, findByFullName, leafOf } from '../taxonomy/lookup.js'
import { getMappingsRepository } from '../mappings/repository.js'

const API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models'

export function isConfigured() {
  return Boolean(env.GEMINI_API_KEY)
}

function stripFence(text) {
  return String(text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim()
}

const SEO_STOP_PHRASES = [
  'shop now', 'buy now', 'order now', 'click here', 'free shipping',
  'shop', 'buy', 'order', 'sale', 'discount', 'best price', 'online store', 'store',
]

function scrubSeo(text) {
  let s = String(text || '')
  for (const p of SEO_STOP_PHRASES) {
    s = s.replace(new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '')
  }
  return s
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,!])/g, '$1')
    .replace(/^[\s,.;:!-]+/, '')
    .replace(/[\s,;:-]+$/, '')
    .trim()
}

function buildPrompt(product, imageCount, candidates) {
  const title = product.title || ''
  const vendor = product.vendor || ''
  const rawBody = (product.body_html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1500)

  return [
    'You are a Shopify catalog copywriter. Return ONLY a JSON object, no prose, no markdown fences.',
    '',
    `PRODUCT TITLE: ${title}`,
    vendor ? `BRAND: ${vendor}` : '',
    rawBody ? `SOURCE TEXT: ${rawBody}` : '',
    `NUMBER OF IMAGES: ${imageCount}`,
    '',
    'TASK — produce this exact JSON shape:',
    '{',
    `  "body_html": "EXACTLY this HTML structure and order: <h2><strong>${title}</strong></h2><p>one engaging intro paragraph (2-3 sentences)</p><h3>Key Features:</h3><ul><li>4 benefit bullets, each 'Bold Lead: detail'</li></ul><h3>How to Use:</h3><ul><li>3 usage/care bullets</li></ul>. Valid HTML only, no markdown, no <script>/<style>. Do NOT include any legal disclaimer (added separately).",`,
    '  "seo_description": "informative meta description, max 155 characters, plain text. Describe the product\'s benefits/features. Do NOT use generic filler or call-to-action words like: shop, shop now, buy, buy now, order, sale, discount, best, online, store, click here, free shipping.",',
    `  "image_alt_texts": [ EXACTLY ${imageCount} alt strings, one per image, in order. RULES: each alt must be UNIQUE and describe a DIFFERENT plausible view/aspect of the product (e.g. front of pack, ingredients, in use, close-up detail, before/after). Do NOT repeat the brand or full product name in every string — mention the product naturally at most once or twice across the whole set. Keep each 4-9 words, natural and human, NOT keyword-stuffed. Vary the wording; never start every alt the same way. ],`,
    '  "type": "the GENERIC product category-noun in 1-2 words — what the item fundamentally IS as a shopper would search for it (e.g. Perfume, Sunscreen, Face Cream, Shampoo, Lipstick, Serum, Hair Color, Scented Candle, T-Shirt). IGNORE marketing names, product-line names, scents, flavours and colours. e.g. \\"Elixir\\" / \\"Magic Potion\\" / \\"Eau De Parfum\\" -> \\"Perfume\\"; \\"Glow Tonic\\" -> \\"Toner\\"; \\"Hazelnut Caramel Candle\\" -> \\"Scented Candle\\"; \\"Permanent Hair Colour\\" -> \\"Hair Color\\". NEVER output a brand name, scent, flavour, or invented marketing word as the type.",',
    '  "product_category": "pick the single best matching path EXACTLY from the CATEGORY OPTIONS below that fits the TYPE you chose"',
    '}',
    '',
    'IMPORTANT: "type" must be a real, generic product noun a shopper would recognise — NOT a brand, scent, flavour, colour, or marketing name. Words like Hazelnut, Caramel, Coffee, Vanilla, Rose, Elixir, Glow, Magic are NOT product types. A "Rose Elixir Perfume" is a Perfume; a "Hazelnut Candle" is a Scented Candle (NOT food).',
    '',
    'CATEGORY OPTIONS (choose product_category verbatim from this list):',
    ...candidates.map((c, i) => `${i + 1}. ${c}`),
    '',
    'If none fit well, choose the closest. Always pick one from the list.',
  ].filter(Boolean).join('\n')
}

export async function enrichProduct(product) {
  if (!isConfigured()) return null

  const images = Array.isArray(product.images) ? product.images : []
  const imageCount = Math.max(images.length, 1)

  const candidates = shortlistCategories(product.title || '', 12).map((c) => c.fullName)
  if (candidates.length === 0) candidates.push('Uncategorized')

  const prompt = buildPrompt(product, imageCount, candidates)
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash-lite'
  const url = `${API_ROOT}/${model}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`

  let resp
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (err) {
    logger.warn(`[Gemini] network error for "${product.title}": ${err.message}`)
    return null
  }

  if (!resp.ok) {
    const detail = await resp.text().catch(() => '')
    logger.warn(`[Gemini] HTTP ${resp.status} for "${product.title}": ${detail.slice(0, 200)}`)

    if (resp.status === 429) {
      const e = new Error('GEMINI_QUOTA_EXCEEDED')
      e.quotaExceeded = true
      throw e
    }
    return null
  }

  let parsed
  try {
    const data = await resp.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
    parsed = JSON.parse(stripFence(text))
  } catch (err) {
    logger.warn(`[Gemini] parse error for "${product.title}": ${err.message}`)
    return null
  }

  const aiType = String(parsed.type || '').trim()

  let categoryPath = ''
  if (aiType) {
    try {
      const repo = getMappingsRepository()

      const variants = []
      const t = aiType
      variants.push(t)
      const stripped = t.replace(/\b(scented|aromatherapy|natural|organic|premium|luxury|herbal)\b/gi, '').replace(/\s+/g, ' ').trim()
      if (stripped && stripped !== t) variants.push(stripped)
      const lastWord = t.split(/\s+/).pop()
      if (lastWord && lastWord !== t) variants.push(lastWord)
      for (const v of variants) {
        const mapped = repo.categoryForType(v)
        if (mapped && findByFullName(mapped)) { categoryPath = mapped; break }
      }
    } catch {  }
  }
  if (!categoryPath) {
    const aiCat = String(parsed.product_category || '').trim()
    if (findByFullName(aiCat)) {
      categoryPath = aiCat
    } else if (aiCat) {
      const aiLeaf = aiCat.split('>').pop().trim().toLowerCase()
      const hit = candidates.find((c) => c.split('>').pop().trim().toLowerCase() === aiLeaf)
      if (hit) categoryPath = hit
    }
  }
  if (!categoryPath) {
    categoryPath = candidates[0] !== 'Uncategorized' ? candidates[0] : ''
  }

  let alts = Array.isArray(parsed.image_alt_texts) ? parsed.image_alt_texts.map(String) : []
  const VIEW_LABELS = ['front view', 'side view', 'back view', 'product detail', 'close-up', 'in use', 'packaging', 'additional view']
  if (alts.length < imageCount) {
    let v = 0
    while (alts.length < imageCount) {
      const label = VIEW_LABELS[v % VIEW_LABELS.length]
      alts.push(`${product.title || 'Product'} – ${label}`)
      v++
    }
  } else if (alts.length > imageCount) {
    alts = alts.slice(0, imageCount)
  }

  return {
    body_html: String(parsed.body_html || '').trim(),
    seo_description: scrubSeo(parsed.seo_description).slice(0, 320),
    image_alt_texts: alts,
    product_category: categoryPath,

    type: aiType || (categoryPath ? leafOf(categoryPath) : ''),
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function enrichProducts(products, { rpm } = {}) {
  const out = products.map((p) => ({ ...p }))

  const limit = Math.max(1, rpm || env.GEMINI_RPM || 10)
  const minGapMs = Math.ceil(60_000 / limit)
  let lastStart = 0

  async function onePass(indices) {
    const stillFailed = []
    let quotaDead = false
    for (const i of indices) {
      const wait = lastStart ? minGapMs - (Date.now() - lastStart) : 0
      if (wait > 0) await sleep(wait)
      lastStart = Date.now()

      let ai = null
      try {
        ai = await enrichProduct(out[i])
      } catch (err) {
        if (err?.quotaExceeded) {

          quotaDead = true
          stillFailed.push(i)
          continue
        }
      }
      if (ai) out[i]._ai = ai
      else stillFailed.push(i)
    }
    return { stillFailed, quotaDead }
  }

  let pending = out.map((_, i) => i)
  let res = await onePass(pending)
  pending = res.stillFailed

  const anyEnriched = out.some((p) => p._ai)
  if (!anyEnriched && res.quotaDead) {
    logger.warn('[Gemini] no products enriched on first pass (quota dead) — skipping retries.')
    return { products: out, enrichedCount: 0, failedCount: out.length, quotaExceeded: true }
  }

  for (let attempt = 1; attempt <= 2 && pending.length > 0; attempt++) {
    if (res.quotaDead) {
      logger.warn(`[Gemini] rate-limited — cooling down 30s before retrying ${pending.length} failed product(s).`)
      await sleep(30_000)
    }
    logger.info(`[Gemini] retry pass ${attempt} for ${pending.length} product(s).`)
    res = await onePass(pending)
    pending = res.stillFailed
  }

  const enrichedCount = out.filter((p) => p._ai).length
  const failedCount = out.length - enrichedCount
  return { products: out, enrichedCount, failedCount, quotaExceeded: failedCount > 0 && pending.length === out.length }
}

