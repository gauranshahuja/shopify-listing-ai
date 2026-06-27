import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { firebaseAuth } from '../lib/firebase.js'
import { fetchMe } from '../api/auth.js'
import { setOnUnauthorized } from '../api/client.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({
    status: 'loading',
    user: null,
    firebaseUser: null,
    error: '',
  })

  const signOutNow = useCallback(async (reason = '') => {
    try { await signOut(firebaseAuth) } catch {}
    setState({ status: 'unauth', user: null, firebaseUser: null, error: reason })
  }, [])

  useEffect(() => {
    setOnUnauthorized(() => {
      setState({ status: 'unauth', user: null, firebaseUser: null, error: 'Session expired. Sign in again.' })
    })
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth, async (fbUser) => {
      if (!fbUser) {
        setState((prev) => ({ status: 'unauth', user: null, firebaseUser: null, error: prev.error || '' }))
        return
      }
      setState({ status: 'syncing', user: null, firebaseUser: fbUser, error: '' })
      try {
        const user = await fetchMe()
        setState({ status: 'auth', user, firebaseUser: fbUser, error: '' })
      } catch (err) {
        const msg = err?.data?.error || err?.message || 'Backend rejected sign-in'
        try { await signOut(firebaseAuth) } catch {}
        setState({ status: 'rejected', user: null, firebaseUser: null, error: msg })
      }
    })
    return () => unsub()
  }, [])

  const signIn = useCallback(async (email, password) => {
    setState((prev) => ({ ...prev, error: '' }))
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password)
    } catch (err) {
      const friendly = mapFirebaseError(err)
      setState((prev) => ({ ...prev, status: 'unauth', error: friendly }))
      throw new Error(friendly)
    }
  }, [])

  const role = state.user?.role
  const isOwner = state.user?.isOwner || role === 'owner' || role === 'admin'
  const value = {
    ...state,
    role,
    isOwner,

    isAdmin: isOwner,

    canShopify: state.user?.canShopify ?? (isOwner || role === 'shopify' || role === 'user'),
    canAmazon: state.user?.canAmazon ?? (isOwner || role === 'amazon' || role === 'user'),
    isAuthenticated: state.status === 'auth',
    signIn,
    signOutNow,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}

function mapFirebaseError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.'
    case 'auth/user-disabled':
      return 'Account disabled. Contact admin.'
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Try again later.'
    case 'auth/network-request-failed':
      return 'Network error. Check connection.'
    default:
      return err?.message || 'Sign-in failed.'
  }
}

