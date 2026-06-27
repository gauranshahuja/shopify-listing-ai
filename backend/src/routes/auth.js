import { Router } from 'express'
import { requireAuth } from '../auth/middleware.js'

const router = Router()

router.get('/me', requireAuth, (req, res) => {
  res.json({
    ok: true,
    user: {
      id: req.user.userId,
      email: req.user.email,
      fullName: req.user.fullName,
      role: req.user.role,
      isAdmin: req.user.isAdmin,
      isOwner: req.user.isOwner,
      canShopify: req.user.canShopify,
      canAmazon: req.user.canAmazon,
    },
  })
})

export default router

