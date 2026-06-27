import { Router } from 'express'
import { requireAuth, requireAdmin } from '../auth/middleware.js'
import { UserService } from '../services/users.js'
import { getFirebaseAuth } from '../auth/firebaseAdmin.js'
import { ROLES } from '../auth/roles.js'
import { logger } from '../utils/logger.js'

const router = Router()
const userService = new UserService()

const ASSIGNABLE_ROLES = ['owner', 'shopify', 'amazon', 'user']

router.use(requireAuth, requireAdmin)

router.get('/users', (req, res) => {
  res.json({ ok: true, users: userService.listAll() })
})

router.post('/users', async (req, res) => {
  try {
    const { email, fullName, role = 'user', password, createInFirebase = true } = req.body || {}
    if (!email) return res.status(400).json({ ok: false, error: 'email required' })
    if (!ROLES.includes(role)) return res.status(400).json({ ok: false, error: `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}` })

    const local = userService.preCreate({ email, fullName, role })

    let firebaseResult = null
    if (createInFirebase) {
      try {
        const fbUser = await getFirebaseAuth().createUser({
          email,
          ...(password ? { password } : {}),
          ...(fullName ? { displayName: fullName } : {}),
          emailVerified: false,
        })
        firebaseResult = { uid: fbUser.uid, created: true }
      } catch (fbErr) {
        logger.warn(`Firebase user creation failed: ${fbErr.message}`)
        firebaseResult = { created: false, error: fbErr.message }
      }
    }

    res.json({ ok: true, user: local, firebase: firebaseResult })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

router.patch('/users/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { isActive, role } = req.body || {}
    if (role && !ROLES.includes(role)) {
      return res.status(400).json({ ok: false, error: `Invalid role. Allowed: ${ASSIGNABLE_ROLES.join(', ')}` })
    }
    let user = null
    if (typeof isActive === 'boolean') user = userService.setActive(id, isActive)
    if (role) user = userService.setRole(id, role)
    res.json({ ok: true, user })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

router.delete('/users/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (id === req.user.userId) return res.status(400).json({ ok: false, error: 'Cannot delete yourself' })
    const target = userService.findById(id)
    if (!target) return res.status(404).json({ ok: false, error: 'Not found' })

    if (target.firebase_uid && !target.firebase_uid.startsWith('pending:')) {
      try { await getFirebaseAuth().deleteUser(target.firebase_uid) }
      catch (err) { logger.warn(`Firebase delete failed: ${err.message}`) }
    }
    userService.delete(id)
    res.json({ ok: true })
  } catch (err) { res.status(500).json({ ok: false, error: err.message }) }
})

export default router

