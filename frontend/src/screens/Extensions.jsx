import React from 'react'
import { motion } from 'framer-motion'
import { ExtensionDownloads } from '../components/ExtensionDownloads.jsx'

export function ExtensionsScreen() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -18 }}
      transition={{ duration: 0.4 }}
      className="px-5 pb-8 pt-4 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Browser Extensions</h1>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Download, load once in Chrome, and sign in. They send scraped products
          straight to Listify, which returns a ready-to-deploy CSV
          (AI content, taxonomy category/type, and temp pricing).
        </p>
        <div className="mt-8">
          <ExtensionDownloads />
        </div>
      </div>
    </motion.div>
  )
}

