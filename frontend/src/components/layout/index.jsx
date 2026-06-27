import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, History, Lock, Play, Puzzle } from 'lucide-react'
import { assetPath } from '../../api/client.js'

export function BackgroundLayers() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[380px] bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.10),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[320px] bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.08),transparent_30%)]" />
    </>
  )
}

export function Header({ screen, user, isAdmin, authVerified, onHome, onEnter, onHistory, onSettings, onExtensions, onLogout }) {
  const subtitle = user?.email
    ? `Signed in as ${user.email}${isAdmin ? ' (Admin)' : ''}`
    : 'Clean catalog workspace'

  return (
    <header className="relative z-10 flex items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <img src={assetPath('logo-mark.svg')} alt="App logo" className="h-8 w-8" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Listify</p>
          <p className="text-xs text-white/45">{subtitle}</p>
        </div>
      </div>

      {authVerified && (
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button onClick={onExtensions} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
            <Puzzle className="h-4 w-4" /> Extensions
          </button>
          <button onClick={onHistory} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
            <History className="h-4 w-4" /> History
          </button>
          {isAdmin && (
            <button onClick={onSettings} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
              ⚙️ Settings
            </button>
          )}
          {screen !== 'landing' ? (
            <button onClick={onHome} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Home
            </button>
          ) : (
            <button onClick={onEnter} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
              <Play className="h-4 w-4" /> Enter
            </button>
          )}
          <button onClick={onLogout} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/78 transition hover:bg-white/10 hover:text-white">
            <Lock className="h-4 w-4" /> Logout
          </button>
        </div>
      )}
    </header>
  )
}

function LoadingLine({ label, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay }}
      className="flex items-center gap-3 rounded-[18px] border border-white/10 bg-black/22 px-4 py-3 text-sm text-white/68"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#84CC16]/50" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#84CC16]" />
      </span>
      {label}
    </motion.div>
  )
}

export function BootScreen({ onSkip }) {
  return (
    <motion.div
      initial={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.5, ease: 'easeInOut' } }}
      className="fixed inset-0 z-50 overflow-hidden bg-[#050505]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.18),transparent_18%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.10),transparent_22%),linear-gradient(180deg,rgba(4,4,4,0.18),rgba(4,4,4,0.92))]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.75)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.75)_1px,transparent_1px)] [background-size:34px_34px]" />

      <div className="relative flex h-full items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 26, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.75, ease: 'easeOut' }}
          className="relative w-full max-w-[860px] overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-5"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(132,204,22,0.12),transparent_24%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="rounded-[28px] border border-white/10 bg-black/28 p-5 sm:p-6">
              <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative mx-auto flex h-[240px] w-full max-w-[360px] items-center justify-center sm:h-[280px]"
              >
                <div className="absolute inset-0 rounded-[28px] bg-[radial-gradient(circle,rgba(132,204,22,0.18),transparent_52%)] blur-2xl" />
                <img src={assetPath('app-illustration.webp')} alt="Illustration" className="relative z-10 max-h-full w-auto object-contain drop-shadow-[0_26px_60px_rgba(0,0,0,0.5)]" />
              </motion.div>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-white/70">
                <span className="h-2 w-2 rounded-full bg-[#84CC16]" /> Launching Workspace
              </div>
              <h2 className="mt-6 text-3xl font-semibold tracking-tight text-white sm:text-[38px]">Listify</h2>
              <p className="mt-4 max-w-lg text-sm leading-7 text-white/66 sm:text-base">A clean workspace for structured product preparation.</p>
              <div className="mt-7 space-y-3">
                <LoadingLine label="Preparing interface" delay={0} />
                <LoadingLine label="Loading workspace" delay={0.08} />
                <LoadingLine label="Almost there" delay={0.16} />
              </div>
              <div className="mt-8 flex items-center justify-between rounded-[22px] border border-white/10 bg-black/24 px-4 py-3 text-sm text-white/62">
                <span>Enter automatically in a moment</span>
                <button onClick={onSkip} className="rounded-full border border-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-white/78 transition hover:bg-white/8">
                  Skip
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

