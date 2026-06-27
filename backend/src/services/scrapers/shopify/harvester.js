import { env } from '../../../config/env.js'

const PAGE_SIZE = 250
const MAX_PAGES = env.SHOPIFY_MAX_PAGES ?? 200
const PAGE_DELAY_MS = env.SHOPIFY_PAGE_DELAY_MS ?? 250

export function cleanHost(input) {
  if (!input || typeof input !== 'string') return null

  let host = input.trim().toLowerCase()
  try {
    if (host.startsWith('http://') || host.startsWith('https://')) {
      host = new URL(host).hostname
    }
  } catch {
    return null
  }

  host = host.replace(/\/+$/, '')

  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(host)) {
    return null
  }

  const blocked = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', 'metadata.google.internal']
  if (blocked.includes(host)) return null

  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null
  return host
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function scrapeStore(host, { allPages = true } = {}) {
  const products = []
  const limit = allPages ? MAX_PAGES : 1

  let sinceId = 0

  for (let page = 1; page <= limit; page++) {
    const url = `https://${host}/products.json?limit=${PAGE_SIZE}` +
      (sinceId ? `&since_id=${sinceId}` : '')

    let resp
    try {
      resp = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopifyListingAI/3.0)' },
        signal: AbortSignal.timeout(30_000),
      })
    } catch (err) {
      const e = new Error(`Network error fetching ${host}: ${err.message}`)
      e.code = 502
      throw e
    }

    if (!resp.ok) {
      const e = new Error(`Upstream returned HTTP ${resp.status} for ${host}`)
      e.code = resp.status === 404 ? 404 : 502
      throw e
    }

    let data
    try {
      data = await resp.json()
    } catch {
      const e = new Error(`Invalid JSON from ${host}`)
      e.code = 502
      throw e
    }

    const batch = data?.products
    if (!Array.isArray(batch) || batch.length === 0) break

    products.push(...batch)

    if (!allPages || batch.length < PAGE_SIZE) break

    const maxId = batch.reduce((m, p) => (p?.id > m ? p.id : m), 0)
    if (!maxId || maxId <= sinceId) break
    sinceId = maxId

    if (page < limit) await sleep(PAGE_DELAY_MS)
  }

  return products
}

export async function fetchProductByHandle(host, handle) {
  if (!handle || !/^[a-z0-9-]+$/i.test(handle)) {
    const e = new Error('Invalid product handle')
    e.code = 400
    throw e
  }

  const url = `https://${host}/products/${handle}.json`

  let resp
  try {
    resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShopifyListingAI/3.0)' },
      signal: AbortSignal.timeout(15_000),
    })
  } catch (err) {
    const e = new Error(`Network error fetching product: ${err.message}`)
    e.code = 502
    throw e
  }

  if (!resp.ok) {
    const e = new Error(`Upstream returned HTTP ${resp.status} for product "${handle}"`)
    e.code = resp.status === 404 ? 404 : 502
    throw e
  }

  let data
  try {
    data = await resp.json()
  } catch {
    const e = new Error('Invalid JSON from product endpoint')
    e.code = 502
    throw e
  }

  if (!data?.product) {
    const e = new Error(`Product "${handle}" not found`)
    e.code = 404
    throw e
  }

  return data.product
}

export function summarize(products) {
  if (!Array.isArray(products) || products.length === 0) {
    return { product_count: 0, variant_count: 0, image_count: 0, vendor_count: 0 }
  }
  const vendors = new Set()
  let variant_count = 0
  let image_count = 0
  for (const p of products) {
    if (p.vendor) vendors.add(p.vendor)
    variant_count += Array.isArray(p.variants) ? p.variants.length : 0
    image_count += Array.isArray(p.images) ? p.images.length : 0
  }
  return {
    product_count: products.length,
    variant_count,
    image_count,
    vendor_count: vendors.size,
  }
}

function csvCell(val) {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

const CSV_HEADERS = [
  'Handle',
  'Title',
  'Body (HTML)',
  'Vendor',
  'Product Category',
  'Type',
  'Tags',
  'Published',
  'Option1 Name',
  'Option1 Value',
  'Option2 Name',
  'Option2 Value',
  'Option3 Name',
  'Option3 Value',
  'Variant SKU',
  'Variant Grams',
  'Variant Inventory Tracker',
  'Variant Inventory Qty',
  'Variant Inventory Policy',
  'Variant Fulfillment Service',
  'Variant Price',
  'Variant Compare At Price',
  'Temp Price',
  'Temp Compare At Price',
  'Variant Requires Shipping',
  'Variant Taxable',
  'Variant Barcode',
  'Image Src',
  'Image Position',
  'Image Alt Text',
  'Gift Card',
  'SEO Title',
  'SEO Description',
  'Google Shopping / Google Product Category',
  'Google Shopping / Gender',
  'Google Shopping / Age Group',
  'Google Shopping / MPN',
  'Google Shopping / AdWords Grouping',
  'Google Shopping / AdWords Labels',
  'Google Shopping / Condition',
  'Google Shopping / Custom Product',
  'Google Shopping / Custom Label 0',
  'Google Shopping / Custom Label 1',
  'Google Shopping / Custom Label 2',
  'Google Shopping / Custom Label 3',
  'Google Shopping / Custom Label 4',
  'Variant Image',
  'Variant Weight Unit',
  'Variant Tax Code',
  'Cost per item',
  'Status',
]

const COL = {
  handle:   CSV_HEADERS.indexOf('Handle'),
  imageSrc: CSV_HEADERS.indexOf('Image Src'),
  imagePos: CSV_HEADERS.indexOf('Image Position'),
  imageAlt: CSV_HEADERS.indexOf('Image Alt Text'),
}

function colLetter(index) {
  let s = ''
  let i = index + 1
  while (i > 0) {
    const m = (i - 1) % 26
    s = String.fromCharCode(65 + m) + s
    i = Math.floor((i - 1) / 26)
  }
  return s
}

const PRICE_COLS = {
  variantPrice:   colLetter(CSV_HEADERS.indexOf('Variant Price')),
  variantCompare: colLetter(CSV_HEADERS.indexOf('Variant Compare At Price')),
  grams:          colLetter(CSV_HEADERS.indexOf('Variant Grams')),
}

function tempPriceFormula(costCol, rowNum) {
  const cost = `${costCol}${rowNum}`
  const wt = `${PRICE_COLS.grams}${rowNum}`

  return `=IF(${cost}="","",ROUNDUP((${cost}+N(${wt})+100)*1.5/94,0)+0.99)`
}

const LEGAL_DISCLAIMER =
  '<p><strong>Legal Disclaimer: </strong><span>The product is guaranteed to be 100% genuine. ' +
  'Product images are for illustrative purposes only. Images/packaging/ labels may vary from time to time ' +
  "due to changes made by the manufacturer's manufacturing batch and location. The product description is " +
  'for information purposes only and may contain additional ingredients.</span></p>'

function buildBodyHtml(product, ai) {
  let body = (ai.body_html || product.body_html || '').replace(/\r?\n/g, ' ').trim()

  if (!body.includes('Legal Disclaimer')) {
    body = body ? `${body}${LEGAL_DISCLAIMER}` : LEGAL_DISCLAIMER
  }
  return body
}

const JUNK_TAGS = new Set([
  'best seller', 'bestseller', 'best-seller', 'best sellers', 'bestsellers',
  'standard products', 'standard product', 'sale', 'on sale', 'new', 'new arrival',
  'new arrivals', 'featured', 'trending', 'popular', 'hot', 'top', 'offer', 'offers',
  'discount', 'deal', 'deals', 'all', 'all products', 'others', 'other', 'general',
])

function isJunkTag(t) {
  return JUNK_TAGS.has(String(t).trim().toLowerCase())
}

function cleanVendor(vendor) {
  let v = String(vendor || '').trim()
  if (!v) return ''
  v = v.replace(/\.(in|com|co|net|org|store|shop|io|co\.in|com\.au|co\.uk)$/i, '')
  v = v.replace(/\s+(store|shop|official|india|online)$/i, '')
  return v.trim()
}

function autoTags(product, type, category) {
  const tags = []
  const vendor = cleanVendor(product.vendor)
  if (vendor) tags.push(vendor)
  if (type) tags.push(String(type).trim())
  if (category) {
    for (const part of String(category).split('>')) {
      const p = part.trim()
      if (p) tags.push(p)
    }
  }
  return tags.filter(Boolean)
}

function mergeTags(...lists) {
  const seen = new Set()
  const out = []
  for (const list of lists) {
    for (const raw of list) {
      const t = String(raw).trim()
      if (!t || isJunkTag(t)) continue
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      out.push(t)
    }
  }
  return out
}

export function buildShopifyCSV(products) {
  const rows = [CSV_HEADERS.join(',')]

  let rowNum = 1

  for (const product of products) {
    const ai = product._ai || {}
    const handle    = product.handle || ''
    const title     = product.title || ''

    const body      = buildBodyHtml(product, ai)
    const vendor    = cleanVendor(product.vendor)

    const type      = ai.type || product.product_type || ''

    const category  = ai.product_category || product.product_category || ''
    const seoDesc   = ai.seo_description || product.seo_description || ''
    const altTexts  = Array.isArray(ai.image_alt_texts) ? ai.image_alt_texts : []
    const published = product.published_at ? 'true' : 'false'

    const baseTags  = Array.isArray(product.tags) ? product.tags.slice() : (product.tags ? String(product.tags).split(',').map((t) => t.trim()) : [])

    const optionNames = Array.isArray(product.options)
      ? product.options.map((o) => o.name || '')
      : ['Title']
    const opt1Name = optionNames[0] || 'Title'
    const opt2Name = optionNames[1] || ''
    const opt3Name = optionNames[2] || ''

    const variants = Array.isArray(product.variants) ? product.variants : []
    const images   = Array.isArray(product.images) ? product.images : []

    const imageById = {}
    for (const img of images) imageById[img.id] = img

    const finalTags = mergeTags(baseTags, autoTags(product, type, category))
    const tags = finalTags.join(', ')
    const status = 'active'

    variants.forEach((variant, vi) => {
      const isFirst = vi === 0
      rowNum++

      const tempPriceCell = tempPriceFormula(PRICE_COLS.variantPrice, rowNum)
      const tempCompareCell = tempPriceFormula(PRICE_COLS.variantCompare, rowNum)

      const vImg = vi < images.length ? images[vi] : null
      const imageSrc = vImg ? (vImg.src || '') : ''
      const imagePos = vImg ? (vImg.position || vi + 1) : ''
      const firstAlt = vImg ? (altTexts[vi] || vImg.alt || '') : ''

      let variantImage = ''
      if (variant.image_id && imageById[variant.image_id]) {
        variantImage = imageById[variant.image_id].src || ''
      } else if (images.length > 0) {
        variantImage = images[0].src || ''
      }

      const weightUnit = 'g'
      let inventoryQty
      if (typeof variant.inventory_quantity === 'number' && variant.inventory_quantity > 0) {
        inventoryQty = variant.inventory_quantity
      } else if (variant.available === false) {
        inventoryQty = 0
      } else {
        inventoryQty = 999
      }

      const row = [
        csvCell(handle),
        csvCell(isFirst ? title : ''),
        csvCell(isFirst ? body : ''),
        csvCell(isFirst ? vendor : ''),
        csvCell(isFirst ? category : ''),
        csvCell(isFirst ? type : ''),
        csvCell(isFirst ? tags : ''),
        csvCell(isFirst ? published : ''),
        csvCell(isFirst ? opt1Name : ''),
        csvCell(variant.option1 || ''),
        csvCell(isFirst ? opt2Name : ''),
        csvCell(variant.option2 || ''),
        csvCell(isFirst ? opt3Name : ''),
        csvCell(variant.option3 || ''),
        csvCell(variant.sku || ''),
        csvCell(variant.grams || 0),
        csvCell('shopify'),
        csvCell(inventoryQty),
        csvCell(variant.inventory_policy || 'deny'),
        csvCell(variant.fulfillment_service || 'manual'),
        csvCell(variant.price || ''),
        csvCell(variant.compare_at_price || ''),
        csvCell(tempPriceCell),
        csvCell(tempCompareCell),
        csvCell(variant.requires_shipping !== false ? 'true' : 'false'),
        csvCell(variant.taxable !== false ? 'true' : 'false'),
        csvCell(variant.barcode || ''),
        csvCell(imageSrc),
        csvCell(imagePos),
        csvCell(firstAlt),
        csvCell(isFirst ? 'false' : ''),
        csvCell(isFirst ? title : ''),
        csvCell(isFirst ? seoDesc : ''),
        csvCell(isFirst ? category : ''),
        csvCell(''), csvCell(''), csvCell(''),
        csvCell(''), csvCell(''), csvCell(''), csvCell(''),
        csvCell(''), csvCell(''), csvCell(''), csvCell(''), csvCell(''),
        csvCell(variantImage),
        csvCell(weightUnit),
        csvCell(''),
        csvCell(variant.cost || ''),
        csvCell(isFirst ? status : ''),
      ]
      if (row.length !== CSV_HEADERS.length) {
        throw new Error(
          `CSV row width mismatch: built ${row.length} cells for ${CSV_HEADERS.length} headers ` +
          `(handle "${handle}"). Header and row builders are out of sync.`
        )
      }
      rows.push(row.join(','))
    })

    for (let i = variants.length; i < images.length; i++) {
      const img = images[i]
      const empty = Array(CSV_HEADERS.length).fill('')
      empty[COL.handle]   = csvCell(handle)
      empty[COL.imageSrc] = csvCell(img.src || '')
      empty[COL.imagePos] = csvCell(img.position || i + 1)
      empty[COL.imageAlt] = csvCell(altTexts[i] || img.alt || '')
      rows.push(empty.join(','))
      rowNum++
    }
  }

  return rows.join('\r\n')
}

