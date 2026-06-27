const PACK_RE = /pack\s*of\s*(\d+)/i

function packCount(title) {
  const m = PACK_RE.exec(title || '')
  return m ? parseInt(m[1], 10) : 1
}

export function baseKey(title) {
  let t = String(title || '')
  t = t.replace(PACK_RE, ' ')
  t = t.replace(/\b\d+(\.\d+)?\s*(ml|g|gm|gms|kg|l|ltr|litre|oz)\b/gi, ' ')
  t = t.replace(/permanent hair colou?r|naturtint/gi, ' ')
  t = t.replace(/[|,–—-]+/g, ' ')
  t = t.replace(/\s+/g, ' ').trim().toLowerCase()
  return t
}

function packLabel(title) {
  const n = packCount(title)
  return `Pack of ${n}`
}

function mergeImages(a = [], b = []) {
  const seen = new Set()
  const out = []
  let pos = 1
  for (const img of [...(a || []), ...(b || [])]) {
    const src = img && img.src
    if (!src || seen.has(src)) continue
    seen.add(src)
    out.push({ ...img, position: pos++ })
  }
  return out
}

export function mergeVariants(products, { optionName = 'Size' } = {}) {
  if (!Array.isArray(products) || products.length < 2) return products || []

  const groups = new Map()
  const order = []
  for (const p of products) {
    const key = baseKey(p.title)
    if (!groups.has(key)) { groups.set(key, []); order.push(key) }
    groups.get(key).push(p)
  }

  const merged = []
  for (const key of order) {
    const members = groups.get(key)

    if (members.length < 2) { merged.push(members[0]); continue }

    const distinctPacks = new Set(members.map((m) => packCount(m.title)))
    if (distinctPacks.size < 2) { for (const m of members) merged.push(m); continue }

    const sorted = [...members].sort((a, b) => packCount(a.title) - packCount(b.title))
    const base = { ...sorted[0] }

    base.options = [{ name: optionName }]
    base.variants = []
    let images = []

    for (const m of sorted) {
      const label = packLabel(m.title)
      const srcVariants = Array.isArray(m.variants) && m.variants.length ? m.variants : [{}]

      const v = { ...srcVariants[0], option1: label, option2: '', option3: '' }
      base.variants.push(v)
      images = mergeImages(images, m.images)
    }

    base.images = images

    base.title = String(sorted[0].title || '').replace(/\s*[|,–—-]?\s*pack\s*of\s*\d+\s*/i, ' ').replace(/\s+/g, ' ').trim()
    merged.push(base)
  }

  return merged
}

