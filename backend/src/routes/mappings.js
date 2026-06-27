import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../auth/middleware.js'
import { requireAdmin } from '../auth/middleware.js'
import { importMappingsCsv } from '../services/mappings/importer.js'
import { getMappingsRepository } from '../services/mappings/repository.js'
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

router.get('/stats', requireAuth, (req, res) => {
  try {
    const stats = getMappingsRepository().stats()
    res.json({ ok: true, ...stats })
  } catch (err) {
    logger.error('Mappings stats failed:', err.message)
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.post('/import', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded. Send a CSV as multipart field "file".' })
    }

    logger.info(`[Mappings Import] ${req.file.originalname} (${req.file.size} bytes) by user=${req.user.email}`)

    const sourceName = req.body.source || req.file.originalname
    const result = importMappingsCsv(req.file.buffer, sourceName)

    res.json({ ok: true, ...result })
  } catch (err) {
    logger.error('Mappings import failed:', err.message)
    res.status(400).json({ ok: false, error: err.message })
  }
})

export default router

