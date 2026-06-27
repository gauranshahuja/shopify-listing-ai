import React from 'react'
import { motion } from 'framer-motion'
import { Globe2, Map } from 'lucide-react'
import { StatusChip } from '../components/ui/index.jsx'
import { assetPath } from '../api/client.js'

const ALL_MODES = [
  {
    id: 'shopify',
    icon: Globe2,
    title: 'Shopify',
    description: 'Harvest a full store or single product. AI content, taxonomy & pricing applied. Ready-to-deploy CSV.',
    muted: 'Store · Product · AI Enrich',
    need: 'canShopify',
  },
  {
    id: 'mappings',
    icon: Map,
    title: 'Mappings',
    description: 'Import reference CSVs to train category, type, and tag rules applied during harvesting.',
    muted: 'Owner · Rule training',
    need: 'isOwner',
  },
]

export function Landing({ selectedMode, setSelectedMode, health, isOwner = false, canShopify = true, canAmazon = false }) {
  const caps = { canShopify, isOwner, canAmazon }

  const MODES = ALL_MODES.filter((m) => caps[m.need])
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.45 }}
      className="relative grid gap-10 px-5 pb-6 pt-2 sm:px-8 sm:pb-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-10 lg:pb-10"
    >
      {}
      <section className="relative z-10 max-w-2xl py-4 lg:py-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-xs uppercase tracking-[0.28em] text-white/70">
          <span className="h-2 w-2 rounded-full bg-[#84CC16]" /> Listify
        </div>

        <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-white sm:text-5xl xl:text-[62px] xl:leading-[1.04]">
          Choose your workflow.
        </h1>

        <p className="mt-5 max-w-lg text-sm leading-7 text-white/66 sm:text-base">
          Shopify harvester with AI content, taxonomy & pricing — a ready-to-deploy CSV every time.
        </p>

        {}
        {MODES.length === 0 && (
          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/[0.05] p-6">
            <p className="text-sm text-white/80 font-medium">Use the Amazon extension</p>
            <p className="mt-2 text-sm text-white/60">
              Your account runs Amazon imports through the browser extension. Open the
              <span className="text-white/80"> Extensions </span> page (top-right) to download it, then sign in there.
            </p>
          </div>
        )}

        {}
        <div className="mt-8 grid gap-4 grid-cols-1 sm:grid-cols-2">
          {MODES.map((mode) => {
            const Icon = mode.icon
            const selected = selectedMode === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => setSelectedMode(mode.id)}
                className={`group relative overflow-hidden rounded-[28px] border p-5 text-left transition duration-300 ${
                  selected
                    ? 'border-white/20 bg-white/[0.08] shadow-[0_22px_70px_rgba(0,0,0,0.28)]'
                    : 'border-white/10 bg-white/[0.04] hover:border-white/16 hover:bg-white/[0.07]'
                }`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_30%)] opacity-0 transition group-hover:opacity-100" />
                <div className="relative z-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/8 text-white">
                    <Icon className="h-4.5 w-4.5 h-5 w-5" />
                  </div>
                  <p className="mt-4 text-base font-medium tracking-tight text-white">{mode.title}</p>
                  <p className="mt-1.5 text-xs leading-5 text-white/55">{mode.description}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.24em] text-white/40">{mode.muted}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Status chips */}
        <div className="mt-6 flex flex-wrap gap-3">
          <StatusChip
            label="Backend"
            value={health?.ok ? 'Connected' : 'Check server'}
            tone={health?.ok ? 'good' : 'muted'}
          />
          <StatusChip
            label="Firebase"
            value={health?.firebase?.configured ? 'Ready' : 'Not configured'}
            tone={health?.firebase?.configured ? 'good' : 'muted'}
          />
        </div>
        {/* Browser-extension downloads live in the top-nav "Extensions" page now,
            so they're not duplicated here on the home screen. */}
      </section>

      {/* ── Right: preview panel ─────────────────────────────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.15 }}
        className="relative z-10"
      >
        <div className="relative mx-auto max-w-[640px] rounded-[34px] border border-white/10 bg-black/35 p-3 shadow-[0_32px_100px_rgba(0,0,0,0.45)]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#101010,#060606)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
              <div>
                <p className="text-sm font-medium text-white">
                  {selectedMode === 'shopify' ? 'Shopify Harvester' : 'Mapping Rules'}
                </p>
                <p className="mt-1 text-xs text-white/50">
                  {selectedMode === 'shopify' ? 'Store / Product → ready-to-deploy CSV' : 'Rule training'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#84CC16]/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              </div>
            </div>

            <div className="relative min-h-[430px] bg-[radial-gradient(circle_at_top,rgba(132,204,22,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_35%)] p-5 sm:min-h-[500px] sm:p-6">
              <img src={assetPath('app-illustration.webp')} alt="" className="pointer-events-none absolute right-0 top-0 h-full w-full object-cover opacity-30" />
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,3,3,0.12),rgba(3,3,3,0.82))]" />

              <div className="relative z-10 space-y-3">
                {selectedMode === 'shopify' && (
                  <>
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm backdrop-blur-md">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/40 mb-1.5">Store domain</p>
                      <p className="font-mono text-white/70">allbirds.com</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Products', '482'], ['Variants', '1 310'], ['Images', '1 842'], ['Mapped', '421']].map(([l, v]) => (
                        <div key={l} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{l}</p>
                          <p className="mt-1 text-lg font-semibold text-white">{v}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {selectedMode === 'mappings' && (
                  <>
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm backdrop-blur-md">
                      <p className="text-xs uppercase tracking-[0.16em] text-white/40 mb-1.5">Rules loaded</p>
                      <p className="font-mono text-white/70">24,000+ mapping rules</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[['Mapping rules', '24k+'], ['Type→Category', '180+']].map(([l, v]) => (
                        <div key={l} className="rounded-[18px] border border-white/10 bg-white/[0.04] px-3 py-2.5">
                          <p className="text-[10px] uppercase tracking-[0.18em] text-white/40">{l}</p>
                          <p className="mt-1 text-lg font-semibold text-white">{v}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}

