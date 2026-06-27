import { getDatabase } from '../db/client.js'
import { logger } from '../utils/logger.js'
import { scrapeStore, buildShopifyCSV, summarize } from './scrapers/shopify/harvester.js'
import { applyMappings } from './transform/csv.js'
import { isConfigured as geminiConfigured, enrichProducts as geminiEnrich } from './ai/gemini.js'
import { getHistoryService } from './history.js'

let _workerRunning = false

export class JobsService {
  constructor() { this.db = getDatabase() }

  enqueue({ userId, host, allPages = true, enrich = true }) {
    const r = this.db.prepare(`
      INSERT INTO jobs (user_id, host, all_pages, enrich, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(userId || null, host, allPages ? 1 : 0, enrich ? 1 : 0)
    return this.findById(r.lastInsertRowid)
  }

  findById(id) { return this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) }

  listForUser(userId, limit = 50) {
    return this.db.prepare(
      'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(userId, limit)
  }

  nextPending() {
    return this.db.prepare("SELECT * FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1").get()
  }

  _setStatus(id, status, extra = {}) {
    const fields = ['status = ?', "updated_at = datetime('now')"]
    const vals = [status]
    if ('error' in extra) { fields.push('error = ?'); vals.push(extra.error || null) }
    if ('historyId' in extra) { fields.push('history_id = ?'); vals.push(extra.historyId || null) }
    if ('productCount' in extra) { fields.push('product_count = ?'); vals.push(extra.productCount || 0) }
    vals.push(id)
    this.db.prepare(`UPDATE jobs SET ${fields.join(', ')} WHERE id = ?`).run(...vals)
  }

  async _runOne(job) {
    this._setStatus(job.id, 'running')
    const startTime = Date.now()
    try {
      const rawProducts = await scrapeStore(job.host, { allPages: !!job.all_pages })
      let { products } = applyMappings(rawProducts)
      if (job.enrich && geminiConfigured()) {
        ;({ products } = await geminiEnrich(products))
      }
      const summary = summarize(products)
      const csv = buildShopifyCSV(products)
      const historyId = getHistoryService().add({
        userId: job.user_id,
        mode: 'store',
        host: job.host,
        vendor: products[0]?.vendor || null,
        productCount: summary.product_count,
        variantCount: summary.variant_count,
        imageCount: summary.image_count,
        durationMs: Date.now() - startTime,
        csv,
      })
      this._setStatus(job.id, 'done', { historyId, productCount: summary.product_count })
      logger.info(`[Jobs] done #${job.id} ${job.host} (${summary.product_count} products)`)
    } catch (err) {
      this._setStatus(job.id, 'error', { error: err.message })
      logger.warn(`[Jobs] error #${job.id} ${job.host}: ${err.message}`)
    }
  }

  startWorker() {
    if (_workerRunning) return
    _workerRunning = true
    ;(async () => {
      try {
        let job
        while ((job = this.nextPending())) {
          await this._runOne(job)
        }
      } finally {
        _workerRunning = false
      }
    })()
  }
}

let _instance = null
export function getJobsService() {
  if (!_instance) _instance = new JobsService()
  return _instance
}

