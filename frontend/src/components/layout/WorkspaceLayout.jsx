import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { StatusPill, SummaryTile } from '../ui/index.jsx'

const STAGES = [
  'Connecting to store…',
  'Fetching product pages…',
  'Applying category & tag mappings…',
  'Resolving Shopify taxonomy…',
  'Running AI enrichment (paced ~10/min)…',
  'Computing pricing & building CSV…',
  'Almost done — finalizing…',
]

function LiveProgress() {
  const [stage, setStage] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const t0 = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 1000)

    const stepper = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 6000)
    return () => { clearInterval(timer); clearInterval(stepper) }
  }, [])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')

  return (
    <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[#84CC16]" />
          <p className="text-sm text-white/85">{STAGES[stage]}</p>
        </div>
        <span className="font-mono text-xs text-white/45 tabular-nums">{mm}:{ss}</span>
      </div>

      {/* Indeterminate moving bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <motion.div
          className="h-full w-1/3 rounded-full bg-[#84CC16]"
          animate={{ x: ['-100%', '320%'] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <p className="mt-3 text-xs text-white/45">
        Working… large stores can take a few minutes. Keep this tab open — another run can't start until this finishes.
      </p>
    </div>
  )
}

export function WorkspaceLayout({ modeLabel, title, description, status, left, right }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.4 }}
      className="relative px-5 pb-6 pt-1 sm:px-8 sm:pb-8 lg:px-10 lg:pb-10"
    >
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-white/42">{modeLabel}</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/62">{description}</p>
            </div>
            <StatusPill tone={status === 'Ready' || status === 'Connected' ? 'good' : 'muted'}>{status}</StatusPill>
          </div>
          {left}
        </section>
        {right}
      </div>
    </motion.div>
  )
}

export function ResultPanel({ result, processing, idleText, summaryTiles, children }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-black/28 p-5 backdrop-blur-xl sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.26em] text-white/42">Result</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">Summary + download.</h3>
        </div>
        {processing ? (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#84CC16]/30 bg-[#84CC16]/[0.10] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-[#bef264]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Working
          </div>
        ) : result && (
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Ready
          </div>
        )}
      </div>

      {!result && !processing && (
        <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.04] p-6">
          <p className="text-sm text-white/70">{idleText}</p>
        </div>
      )}

      {processing && <LiveProgress />}

      {result && (
        <>
          {summaryTiles?.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {summaryTiles.map(([label, value]) => (
                <SummaryTile key={label} label={label} value={value} />
              ))}
            </div>
          )}
          {children && <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] p-4">{children}</div>}
        </>
      )}
    </section>
  )
}

