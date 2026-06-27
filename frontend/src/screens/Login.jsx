import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Lock, Play } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext.jsx'

export function Login() {
  const { signIn, error: contextError, status } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState('')
  const error = localError || contextError
  const isSyncing = status === 'syncing'

  async function onSubmit(e) {
    e.preventDefault()
    setLocalError('')
    setLoading(true)
    try {
      await signIn(email, password)
      setPassword('')
    } catch (err) {
      setLocalError(err.message || 'Sign-in failed.')
    } finally {
      setLoading(false)
    }
  }

  const submitting = loading || isSyncing

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.35 }}
      className="relative px-5 pb-8 pt-2 sm:px-8 lg:px-10 lg:pb-10"
    >
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/10 bg-black/28 p-6 backdrop-blur-xl">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Lock className="h-5 w-5" />
        </div>
        <p className="mt-5 text-xs uppercase tracking-[0.26em] text-white/42">Sign in</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">Welcome back</h2>
        <p className="mt-3 text-sm leading-6 text-white/62">
          Use your office email and password. Accounts are managed by the admin.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com" autoComplete="email" disabled={submitting}
            className="block w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/20 disabled:opacity-60"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" autoComplete="current-password" disabled={submitting}
            className="block w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-white/28 focus:border-white/20 disabled:opacity-60"
          />
          {error && <p className="text-sm text-red-200">{error}</p>}
          <button
            type="submit" disabled={!email.trim() || !password.trim() || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {submitting ? (isSyncing ? 'Verifying account' : 'Signing in') : 'Open workspace'}
          </button>
        </form>
      </div>
    </motion.div>
  )
}

