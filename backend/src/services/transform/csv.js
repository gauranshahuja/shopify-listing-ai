import { parse } from 'csv-parse/sync'
import { findMatch } from '../mappings/matcher.js'
import { getMappingsRepository } from '../mappings/repository.js'
import { buildShopifyCSV } from '../scrapers/shopify/harvester.js'

export function parseCsvToProducts(buffer) {
  const records = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  })

  if (!records.length) throw new Error('CSV has no data rows')

  const headers = Object.keys(records[0]).map((h) => h.trim().toLowerCase())

  const isShopifyFormat = headers.includes('handle') && headers.some((h) => h.includes('variant'))

  if (isShopifyFormat) {
    return parseShopifyCsv(records)
  }
  return parseGenericCsv(records)
}

function parseShopifyCsv(records) {
  const col = (rec, ...names) => {
    for (const name of names) {
      const key = Object.keys(rec).find((k) => k.trim().toLowerCase() === name.toLowerCase())
      if (key && rec[key]) return rec[key].trim()
    }
    return ''
  }

  const productMap = new Map()

  for (const rec of records) {
    const handle = col(rec, 'handle')
    if (!handle) continue

    if (!productMap.has(handle)) {
      productMap.set(handle, {
        handle,
        title: col(rec, 'title'),
        body_html: col(rec, 'body (html)', 'body_html'),
        vendor: col(rec, 'vendor'),
        product_type: col(rec, 'type', 'product_type'),
        tags: col(rec, 'tags'),
        published_at: col(rec, 'published') === 'true' ? new Date().toISOString() : null,
        options: [
          { name: col(rec, 'option1 name') || 'Title' },
          { name: col(rec, 'option2 name') },
          { name: col(rec, 'option3 name') },
        ].filter((o) => o.name),
        variants: [],
        images: [],
      })
    }

    const product = productMap.get(handle)

    const sku = col(rec, 'variant sku')
    const price = col(rec, 'variant price')
    if (price || sku) {
      product.variants.push({
        sku,
        price,
        compare_at_price: col(rec, 'variant compare at price'),
        grams: col(rec, 'variant grams') || 0,
        option1: col(rec, 'option1 value'),
        option2: col(rec, 'option2 value'),
        option3: col(rec, 'option3 value'),
        requires_shipping: col(rec, 'variant requires shipping') !== 'false',
        taxable: col(rec, 'variant taxable') !== 'false',
        image_id: null,
      })
    }

    const imgSrc = col(rec, 'image src')
    if (imgSrc && !product.images.find((i) => i.src === imgSrc)) {
      product.images.push({
        id: product.images.length + 1,
        src: imgSrc,
        position: parseInt(col(rec, 'image position')) || product.images.length + 1,
        alt: col(rec, 'image alt text'),
      })
    }
  }

  return Array.from(productMap.values())
}

function parseGenericCsv(records) {
  const products = []

  for (const rec of records) {
    const get = (keys) => {
      for (const k of keys) {
        const found = Object.keys(rec).find((h) => h.trim().toLowerCase() === k)
        if (found && rec[found]) return rec[found].trim()
      }
      return ''
    }

    const title = get(['title', 'name', 'product name', 'product_name'])
    if (!title) continue

    const handle = get(['handle', 'slug']) ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    const product = {
      handle,
      title,
      body_html: get(['body (html)', 'body_html', 'description', 'desc']),
      vendor: get(['vendor', 'brand', 'manufacturer']),
      product_type: get(['type', 'product_type', 'category']),
      tags: get(['tags', 'tag']),
      published_at: new Date().toISOString(),
      options: [{ name: 'Title' }],
      variants: [{
        sku: get(['variant sku', 'sku', 'item_no', 'item no']),
        price: get(['variant price', 'price', 'sale_price']),
        compare_at_price: get(['variant compare at price', 'compare_at_price', 'original_price', 'msrp']),
        grams: get(['variant grams', 'weight', 'grams']) || 0,
        option1: 'Default Title',
        requires_shipping: true,
        taxable: true,
        image_id: null,
      }],
      images: [],
    }

    const imgSrc = get(['image src', 'image_src', 'image', 'photo', 'photo_url'])
    if (imgSrc) {
      product.images.push({ id: 1, src: imgSrc, position: 1, alt: title })
    }

    products.push(product)
  }

  return products
}

const JUNK_TYPES = new Set([
  'male', 'female', 'men', 'women', 'mens', 'womens', "men's", "women's",
  'unisex', 'kids', 'boys', 'girls', 'baby',
  'all seasons', 'all season', 'summer', 'winter', 'monsoon', 'spring', 'autumn',
  'new', 'sale', 'best seller', 'bestseller', 'general', 'others', 'other', 'na', 'n/a',
])
function isJunkType(t) {
  return !t || JUNK_TYPES.has(String(t).trim().toLowerCase())
}

export function applyMappings(products) {
  const repo = getMappingsRepository()
  let matchedCount = 0
  let unmatchedCount = 0

  const enriched = products.map((p) => {

    const scrapedType = isJunkType(p.product_type) ? '' : p.product_type

    const titleType = repo.detectTypeFromTitle(p.title)

    const scrapedCat = scrapedType ? (repo.categoryForType(scrapedType) || '') : ''
    const titleCat = titleType ? (repo.categoryForType(titleType) || '') : ''
    const scrapedIsFood = /^food, beverages/i.test(scrapedCat)
    const titleIsFood = /^food, beverages/i.test(titleCat)
    let effectiveType
    if (titleType && scrapedType && scrapedIsFood && !titleIsFood) {
      effectiveType = titleType
    } else {
      effectiveType = scrapedType || titleType || ''
    }

    const match = findMatch({
      brand: p.vendor,
      title: p.title,
      type: effectiveType,
      handle: p.handle,
    })

    if (match) {
      matchedCount++
      return {
        ...p,
        product_type: effectiveType || match.type || '',

        product_category: match.category || p.product_category || '',
        tags: p.tags || match.tags || '',
      }
    }

    if (effectiveType) {
      const cat = repo.categoryForType(effectiveType)
      unmatchedCount++
      return {
        ...p,
        product_type: effectiveType,
        product_category: cat || (isJunkType(p.product_type) ? '' : p.product_category) || '',
        tags: p.tags || '',
      }
    }

    unmatchedCount++

    return isJunkType(p.product_type) ? { ...p, product_type: '' } : p
  })

  return { products: enriched, matchedCount, unmatchedCount }
}

export function processCsv(buffer) {
  const products = parseCsvToProducts(buffer)
  const { products: enriched, matchedCount, unmatchedCount } = applyMappings(products)
  const csv = buildShopifyCSV(enriched)
  return {
    products: enriched,
    csv,
    productCount: enriched.length,
    matchedCount,
    unmatchedCount,
  }
}

