import React from 'react'
import { AlertCircle, Download } from 'lucide-react'

export function StatusPill({ children, tone = 'muted' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.22em] ${
        tone === 'good'
          ? 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200'
          : 'border-white/10 bg-white/6 text-white/70'
      }`}
    >
      {children}
    </span>
  )
}

export function StatusChip({ label, value, tone }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
        tone === 'good'
          ? 'border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200'
          : 'border-white/10 bg-white/6 text-white/70'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${tone === 'good' ? 'bg-emerald-300' : 'bg-white/30'}`} />
      <span className="uppercase tracking-[0.22em] text-[10px]">{label}</span>
      <span className="tracking-normal text-xs normal-case">{value}</span>
    </div>
  )
}

export function SummaryTile({ label, value }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

export function PreviewField({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/68">
      <span>{label}</span>
      <span className="font-medium text-white/82">{value}</span>
    </div>
  )
}

export function ActionPanel({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 backdrop-blur-md">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-black/25 text-white">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-white/55">{text}</p>
    </div>
  )
}

export function WarningBox({ error, warnings = [], errorTitle = 'Error' }) {
  return (
    <>
      {error && (
        <div className="mt-5 rounded-[22px] border border-red-400/20 bg-red-500/[0.08] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-300" />
            <div>
              <p className="text-sm font-medium text-red-100">{errorTitle}</p>
              <p className="mt-1 text-sm leading-6 text-red-100/75">{error}</p>
            </div>
          </div>
        </div>
      )}
      {!!warnings?.length && (
        <div className="mt-5 rounded-[22px] border border-amber-400/20 bg-amber-500/[0.08] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-amber-100">
            <AlertCircle className="h-4 w-4" /> Warnings
          </div>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-amber-100/75">
            {warnings.slice(0, 8).map((w, i) => <li key={i}>• {w}</li>)}
          </ul>
        </div>
      )}
    </>
  )
}

export function DownloadButton({ csv, fileName, label, primary = true, onClick }) {
  if (!csv && !onClick) return null
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-medium transition ${
        primary
          ? 'border-white/10 bg-white text-black hover:opacity-90'
          : 'border-white/10 bg-white/8 text-white hover:bg-white/12'
      }`}
    >
      <Download className="h-4 w-4" />
      {label || fileName || 'Download'}
    </button>
  )
}

