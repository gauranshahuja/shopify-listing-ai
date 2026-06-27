import { Router } from 'express'
import { requireAuth, requireShopify } from '../auth/middleware.js'
import {
  cleanHost,
  scrapeStore,
  fetchProductByHandle,
  summarize,
  buildShopifyCSV,
} from '../services/scrapers/shopify/harvester.js'
import { applyMappings } from '../services/transform/csv.js'
import { mergeVariants } from '../services/transform/mergeVariants.js'
import { enrichProducts as geminiEnrich, isConfigured as geminiConfigured } from '../services/ai/gemini.js'
import { getHistoryService } from '../services/history.js'
import { getJobsService } from '../services/jobs.js'
import { logger } from '../utils/logger.js'

const router = Router()

function countNeedsReview(products) {
  return products.reduce((n, p) => {
    const vs = Array.isArray(p.variants) ? p.variants : []
    return n + (vs.some((v) => !v.price || !v.grams) ? 1 : 0)
  }, 0)
}

function countEnriched(products) {
  return products.reduce((n, p) => n + (p._ai ? 1 : 0), 0)
}

router.post('/scrape', requireAuth, requireShopify, async (req, res) => {
  const startTime = Date.now()
  try {
    const { host: rawHost, allPages = true } = req.body || {}
    const host = cleanHost(rawHost)
    if (!host) {
      return res.status(400).json({ ok: false, error: 'Invalid Shopify host. Provide a valid domain, e.g. "brand.myshopify.com".' })
    }

    logger.info(`[Shopify Store] ${host} allPages=${allPages} by user=${req.user.email}`)

    const rawProducts = await scrapeStore(host, { allPages })

    const mergedProducts = mergeVariants(rawProducts)

    let { products, matchedCount, unmatchedCount } = applyMappings(mergedProducts)

    const { enrich = true } = req.body || {}
    if (enrich && geminiConfigured()) {
      ;({ products } = await geminiEnrich(products))
    }

    const summary = summarize(products)
    const csv = buildShopifyCSV(products)
    const durationMs = Date.now() - startTime
    const safeHost = host.replace(/\./g, '-')
    const fileName = `${safeHost}-shopify.csv`

    try {
      getHistoryService().add({
        userId: req.user.userId,
        mode: 'store',
        host,
        handle: null,
        vendor: products[0]?.vendor || null,
        productCount: summary.product_count,
        variantCount: summary.variant_count,
        imageCount: summary.image_count,
        durationMs,
        csv,
      })
    } catch (err) {
      logger.warn('History write failed:', err.message)
    }

    res.json({
      ok: true,
      mode: 'store',
      host,
      summary,
      matchedCount,
      unmatchedCount,
      enrichedCount: countEnriched(products),
      needsReviewCount: countNeedsReview(products),
      aiConfigured: geminiConfigured(),
      csv,
      fileName,
      durationMs,
      rawProducts: products,
    })
  } catch (err) {
    const status = err.code === 400 ? 400 : 502
    logger.error('Shopify scrape failed:', err.message)
    res.status(status).json({ ok: false, error: err.message })
  }
})

router.post('/product', requireAuth, requireShopify, async (req, res) => {
  const startTime = Date.now()
  try {
    const { host: rawHost, handle } = req.body || {}
    const host = cleanHost(rawHost)
    if (!host) {
      return res.status(400).json({ ok: false, error: 'Invalid Shopify host. Provide a valid domain, e.g. "brand.myshopify.com".' })
    }
    if (!handle || typeof handle !== 'string' || !/^[a-z0-9-]+$/i.test(handle.trim())) {
      return res.status(400).json({ ok: false, error: 'Invalid product handle. Use the slug from the product URL, e.g. "running-shoe-v2".' })
    }

    const cleanHandle = handle.trim().toLowerCase()
    logger.info(`[Shopify Product] ${host}/products/${cleanHandle} by user=${req.user.email}`)

    const rawProduct = await fetchProductByHandle(host, cleanHandle)

    let { products, matchedCount, unmatchedCount } = applyMappings([rawProduct])

    const { enrich = true } = req.body || {}
    if (enrich && geminiConfigured()) {
      ;({ products } = await geminiEnrich(products))
    }
    const product = products[0]

    const summary = summarize(products)
    const csv = buildShopifyCSV(products)
    const durationMs = Date.now() - startTime
    const safeHost = host.replace(/\./g, '-')
    const fileName = `${safeHost}-${cleanHandle}.csv`

    try {
      getHistoryService().add({
        userId: req.user.userId,
        mode: 'product',
        host,
        handle: cleanHandle,
        vendor: product.vendor || null,
        productCount: 1,
        variantCount: summary.variant_count,
        imageCount: summary.image_count,
        durationMs,
        csv,
      })
    } catch (err) {
      logger.warn('History write failed:', err.message)
    }

    res.json({
      ok: true,
      mode: 'product',
      host,
      handle: cleanHandle,
      summary,
      matchedCount,
      unmatchedCount,
      enrichedCount: countEnriched(products),
      needsReviewCount: countNeedsReview(products),
      aiConfigured: geminiConfigured(),
      csv,
      fileName,
      durationMs,
      rawProducts: products,
    })
  } catch (err) {
    const status = err.code === 400 ? 400 : err.code === 404 ? 404 : 502
    logger.error('Shopify product fetch failed:', err.message)
    res.status(status).json({ ok: false, error: err.message })
  }
})

router.post('/build', requireAuth, async (req, res) => {
  const startTime = Date.now()
  try {
    const { products: input, fileName: inputName, enrich = true, source = 'extension' } = req.body || {}
    if (!Array.isArray(input) || input.length === 0) {
      return res.status(400).json({ ok: false, error: 'products array required' })
    }

    const isAmazonSource = /amazon/i.test(source)
    if (isAmazonSource && !req.user.canAmazon) {
      return res.status(403).json({ ok: false, error: 'Your account is not allowed to run Amazon imports.' })
    }
    if (!isAmazonSource && !req.user.canShopify) {
      return res.status(403).json({ ok: false, error: 'Your account is not allowed to run Shopify harvests.' })
    }

    logger.info(`[Build] ${input.length} products (source=${source}, enrich=${enrich}) by user=${req.user.email}`)

    const toMap = isAmazonSource ? input : mergeVariants(input)

    let { products } = applyMappings(toMap)

    let enrichedCount = 0
    let failedCount = 0
    if (enrich && geminiConfigured()) {
      const result = await geminiEnrich(products)
      products = result.products
      enrichedCount = result.enrichedCount
      failedCount = result.failedCount
    }

    const csv = buildShopifyCSV(products)
    const summary = summarize(products)

    const needsReviewCount = products.reduce((n, p) => {
      const vs = Array.isArray(p.variants) ? p.variants : []
      const flagged = vs.some((v) => !v.price || !v.grams)
      return n + (flagged ? 1 : 0)
    }, 0)

    const durationMs = Date.now() - startTime
    const fileName = inputName
      ? inputName.replace(/\.csv$/i, '') + '-ready.csv'
      : `ready-to-deploy-${Date.now()}.csv`

    try {
      const firstHost = (input[0] && (input[0].host || input[0].vendor)) || ''
      getHistoryService().add({
        userId: req.user.userId,
        mode: isAmazonSource ? 'amazon' : 'extension',
        host: firstHost || source,
        handle: null,
        vendor: products[0]?.vendor || null,
        productCount: summary.product_count,
        variantCount: summary.variant_count,
        imageCount: summary.image_count,
        durationMs,
        csv,
      })
    } catch (err) {
      logger.warn('History write failed (build):', err.message)
    }

    res.json({
      ok: true,
      csv,
      fileName,
      summary,
      enrichedCount,
      failedCount,
      needsReviewCount,
      aiConfigured: geminiConfigured(),
      durationMs,
    })
  } catch (err) {
    logger.error('Build failed:', err.message)
    res.status(err.status || err.code || 500).json({ ok: false, error: err.message })
  }
})

router.post('/enrich', requireAuth, async (req, res) => {
  const startTime = Date.now()
  try {
    const { products: inputProducts, fileName: inputFileName } = req.body || {}
    if (!Array.isArray(inputProducts) || !inputProducts.length) {
      return res.status(400).json({ ok: false, error: 'products array required' })
    }

    logger.info(`[AI Enrich] ${inputProducts.length} products by user=${req.user.email}`)

    let { products } = applyMappings(mergeVariants(inputProducts))
    let enrichedCount = 0, failedCount = 0
    if (geminiConfigured()) {
      const result = await geminiEnrich(products)
      products = result.products
      enrichedCount = result.enrichedCount
      failedCount = result.failedCount
    }
    const csv = buildShopifyCSV(products)
    const durationMs = Date.now() - startTime
    const fileName = inputFileName
      ? inputFileName.replace('.csv', '-enriched.csv')
      : `enriched-${Date.now()}.csv`

    res.json({ ok: true, csv, fileName, enrichedCount, failedCount, durationMs })
  } catch (err) {
    logger.error('AI enrich failed:', err.message)
    res.status(err.status || err.code || 500).json({ ok: false, error: err.message })
  }
})

router.post('/jobs', requireAuth, requireShopify, (req, res) => {
  try {
    const { hosts, host, allPages = true, enrich = true } = req.body || {}
    const list = Array.isArray(hosts) ? hosts : (host ? [host] : [])
    const cleaned = list.map(cleanHost).filter(Boolean)
    if (cleaned.length === 0) {
      return res.status(400).json({ ok: false, error: 'Provide one or more Shopify store domains.' })
    }
    const svc = getJobsService()
    const created = cleaned.map((h) => svc.enqueue({ userId: req.user.userId, host: h, allPages, enrich }))
    svc.startWorker()
    res.json({ ok: true, jobs: created })
  } catch (err) {
    logger.error('Enqueue jobs failed:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.get('/jobs', requireAuth, (req, res) => {
  const svc = getJobsService()
  svc.startWorker()
  res.json({ ok: true, jobs: svc.listForUser(req.user.userId, 50) })
})

export default router

