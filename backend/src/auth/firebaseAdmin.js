import admin from 'firebase-admin'
import { env } from '../config/env.js'
import { logger } from '../utils/logger.js'

let initialized = false

export function initFirebase() {
  if (initialized || admin.apps.length) {
    initialized = true
    return admin.app()
  }

  if (!env.FIREBASE_PROJECT_ID) {
    logger.warn('Firebase not configured — missing FIREBASE_PROJECT_ID')
    return null
  }

  try {
    if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON)

      const app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: env.FIREBASE_PROJECT_ID,
      })

      initialized = true
      logger.info('Firebase Admin initialized using service account JSON')
      return app
    }

    const app = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: env.FIREBASE_PROJECT_ID,
    })

    initialized = true
    logger.info('Firebase Admin initialized using application default credentials')
    return app
  } catch (err) {
    initialized = false
    logger.error('Firebase init failed:', err.message)
    return null
  }
}

export function getFirebaseAuth() {
  const app = initFirebase()

  if (!app) {
    const err = new Error('Firebase Admin is not initialized. Check FIREBASE_PROJECT_ID and Cloud Run service account permissions.')
    err.status = 500
    throw err
  }

  return admin.auth(app)
}
