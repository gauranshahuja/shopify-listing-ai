import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../auth/middleware.js'
import { processCsv } from '../services/transform/csv.js'
import { getHistoryService } from '../services/history.js'
import { logger } from '../utils/logger.js'

const router = Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true)
    else cb(new Error('Only CSV files are accepted'))
  },
})

router.post('/process', requireAuth, upload.single('file'), async (req, res) => {
  const startTime = Date.now()
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded. Send a CSV as multipart field "file".' })
    }

    logger.info(`[CSV Process] ${req.file.originalname} (${req.file.size} bytes) by user=${req.user.email}`)

    const { csv, productCount, matchedCount, unmatchedCount } = processCsv(req.file.buffer)
    const durationMs = Date.now() - startTime

    const safeName = req.file.originalname.replace(/[^\w.-]/g, '_').replace(/\.csv$/i, '')
    const fileName = `${safeName}-shopify.csv`

    try {
      getHistoryService().add({
        userId: req.user.userId,
        mode: 'csv',
        host: req.file.originalname,
        handle: null,
        vendor: null,
        productCount,
        variantCount: 0,
        imageCount: 0,
        durationMs,
      })
    } catch (err) {
      logger.warn('History write failed:', err.message)
    }

    res.json({
      ok: true,
      mode: 'csv',
      fileName,
      productCount,
      matchedCount,
      unmatchedCount,
      csv,
      durationMs,
    })
  } catch (err) {
    logger.error('CSV process failed:', err.message)
    res.status(400).json({ ok: false, error: err.message })
  }
})

export default router

