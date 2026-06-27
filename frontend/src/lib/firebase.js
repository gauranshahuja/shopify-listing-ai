import { initializeApp } from 'firebase/app'
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth'

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const firebaseApp = initializeApp(config)
export const firebaseAuth = getAuth(firebaseApp)
setPersistence(firebaseAuth, browserLocalPersistence).catch(() => {})

export async function getIdToken(forceRefresh = false) {
  const user = firebaseAuth.currentUser
  if (!user) return ''
  try { return await user.getIdToken(forceRefresh) } catch { return '' }
}

