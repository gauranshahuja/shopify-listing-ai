import { getFirebaseAuth } from './firebaseAdmin.js'
import { UserService } from '../services/users.js'
import { isOwner, canShopify, canAmazon } from './roles.js'

const userService = new UserService()

export async function requireAuth(req, res, next) {
  try {
    const h = req.headers.authorization || ''
    const m = h.match(/^Bearer\s+(.+)$/)
    if (!m) return res.status(401).json({ ok: false, error: 'Missing Bearer token' })

    const decoded = await getFirebaseAuth().verifyIdToken(m[1])
    const user = userService.syncFromFirebase(decoded)
    if (!user.is_active) return res.status(403).json({ ok: false, error: 'Account disabled' })

    req.user = {
      userId: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isOwner: isOwner(user.role),

      isAdmin: isOwner(user.role),
      canShopify: canShopify(user.role),
      canAmazon: canAmazon(user.role),
    }
    next()
  } catch (err) {
    const status = err.status || 401
    res.status(status).json({ ok: false, error: err.message || 'Auth failed' })
  }
}

export function requireOwner(req, res, next) {
  if (!req.user?.isOwner) return res.status(403).json({ ok: false, error: 'Owner access required' })
  next()
}

export const requireAdmin = requireOwner

export function requireShopify(req, res, next) {
  if (!req.user?.canShopify) {
    return res.status(403).json({ ok: false, error: 'Your account is not allowed to run Shopify harvests.' })
  }
  next()
}

export function requireAmazon(req, res, next) {
  if (!req.user?.canAmazon) {
    return res.status(403).json({ ok: false, error: 'Your account is not allowed to run Amazon imports.' })
  }
  next()
}

