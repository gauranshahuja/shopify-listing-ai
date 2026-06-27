import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'
import { getHistoryService } from '../services/history.js'

const router = Router()

router.get('/', requireAuth, (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || '200', 10), 500)
  const scope = req.query.scope === 'all' && req.user.isAdmin ? 'all' : 'me'
  const items = getHistoryService().list({ userId: req.user.userId, limit, scope })
  res.json({ ok: true, items })
})

router.get('/:id/download', requireAuth, (req, res) => {
  const id = parseInt(req.params.id, 10)
  const dl = getHistoryService().getDownload(id, { userId: req.user.userId, isOwner: req.user.isOwner })
  if (!dl) {
    return res.status(404).json({ ok: false, error: 'CSV not available (it may have expired after 4 hours).' })
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', `attachment; filename="${dl.fileName}"`)
  res.send('﻿' + dl.csv)
})

router.delete('/', requireAuth, (req, res) => {
  const cleared = getHistoryService().clearForUser(req.user.userId)
  res.json({ ok: true, cleared })
})

export default router

