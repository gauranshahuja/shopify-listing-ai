import express from 'express'
import cors from 'cors'
import { env, validateEnv } from './config/env.js'
import { logger } from './utils/logger.js'
import { runMigrations } from './db/migrate.js'
import { initFirebase } from './auth/firebaseAdmin.js'

import authRoutes from './routes/auth.js'
import shopifyRoutes from './routes/shopify.js'
import csvRoutes from './routes/csv.js'
import mappingsRoutes from './routes/mappings.js'
import historyRoutes from './routes/history.js'
import adminRoutes from './routes/admin.js'

const envErrors = validateEnv()
if (envErrors.length) {
  logger.warn(`Env validation: ${envErrors.length} issue(s)`)
  for (const e of envErrors) logger.warn('  • ' + e)
}

if (env.NODE_ENV === 'production' && !env.CORS_ORIGINS) {
  logger.error('FATAL: CORS_ORIGINS must be set in production. Refusing to start.')
  process.exit(1)
}

runMigrations()
initFirebase()

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

const corsOrigins = env.CORS_ORIGINS
  ? env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : ['http://localhost:5173']

function corsOriginCheck(origin, callback) {

  if (!origin) return callback(null, true)
  if (corsOrigins.includes(origin)) return callback(null, true)
  if (/^chrome-extension:\/\//.test(origin) || /^moz-extension:\/\//.test(origin)) {
    return callback(null, true)
  }
  return callback(new Error(`Origin ${origin} not allowed by CORS`))
}

app.use(cors({ origin: corsOriginCheck, credentials: true }))
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true, limit: '20mb' }))

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'shopify-listing-ai',
    version: '3.0.0',
    time: new Date().toISOString(),
    firebase: { configured: Boolean(env.FIREBASE_PROJECT_ID) },
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/shopify', shopifyRoutes)
app.use('/api/csv', csvRoutes)
app.use('/api/mappings', mappingsRoutes)
app.use('/api/history', historyRoutes)
app.use('/api/admin', adminRoutes)

app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }))

app.use((err, req, res, next) => {
  logger.error('Unhandled:', err)
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Server error' })
})

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Listify ready on :${env.PORT}`)
})

function shutdown(sig) {
  logger.info(`${sig} received, shutting down`)
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export default app

