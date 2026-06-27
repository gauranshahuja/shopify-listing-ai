import React, { useEffect, useState } from 'react'
import { AnimatePresence } from 'framer-motion'

import { useAuth } from './contexts/AuthContext.jsx'
import { useHealth } from './lib/useHealth.js'

import { BackgroundLayers, Header, BootScreen } from './components/layout/index.jsx'

import { Login } from './screens/Login.jsx'
import { Landing } from './screens/Landing.jsx'
import { ShopifyWorkspace } from './screens/workspaces/ShopifyWorkspace.jsx'
import { MappingsWorkspace } from './screens/workspaces/MappingsWorkspace.jsx'
import { HistoryScreen } from './screens/History.jsx'
import { SettingsScreen } from './screens/Settings/index.jsx'
import { ExtensionsScreen } from './screens/Extensions.jsx'

export default function App() {
  const [showBoot, setShowBoot] = useState(true)
  const [selectedMode, setSelectedMode] = useState('shopify')
  const [screen, setScreen] = useState('landing')

  const { status, isAuthenticated, isAdmin, isOwner, canShopify, canAmazon, user, signOutNow } = useAuth()
  const { health } = useHealth(isAuthenticated)

  useEffect(() => {
    const t = setTimeout(() => setShowBoot(false), 2800)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return
    if (selectedMode === 'shopify' && !canShopify) setSelectedMode(isOwner ? 'mappings' : 'shopify')
    if (selectedMode === 'mappings' && !isOwner) setSelectedMode('shopify')
  }, [isAuthenticated, canShopify, isOwner, selectedMode])

  function openSelected() {
    setScreen(selectedMode)
  }

  async function handleLogout() {
    await signOutNow('')
    setScreen('landing')
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#050505] text-white">
      <AnimatePresence>
        {showBoot && <BootScreen onSkip={() => setShowBoot(false)} />}
      </AnimatePresence>

      <main className="relative isolate min-h-screen">
        <BackgroundLayers />

        <section className="mx-auto flex min-h-screen w-full max-w-[1440px] items-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="relative w-full overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] shadow-[0_40px_140px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_24%)]" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.7)_1px,transparent_1px)] [background-size:36px_36px]" />

            <Header
              screen={screen} user={user} isAdmin={isAdmin} authVerified={isAuthenticated}
              onHome={() => setScreen('landing')}
              onEnter={openSelected}
              onHistory={() => setScreen('history')}
              onSettings={() => setScreen('settings')}
              onExtensions={() => setScreen('extensions')}
              onLogout={handleLogout}
            />

            {status === 'loading' || status === 'syncing' ? (
              <div className="px-5 py-16 text-center text-sm text-white/60">
                {status === 'syncing' ? 'Verifying your account…' : 'Loading…'}
              </div>
            ) : !isAuthenticated ? (
              <Login />
            ) : (
              <AnimatePresence mode="wait">
                {screen === 'landing' && (
                  <Landing key="landing" selectedMode={selectedMode} setSelectedMode={setSelectedMode} health={health}
                    isOwner={isOwner} canShopify={canShopify} canAmazon={canAmazon} />
                )}
                {screen === 'shopify' && <ShopifyWorkspace key="shopify" health={health} />}
                {screen === 'mappings' && <MappingsWorkspace key="mappings" />}
                {screen === 'history' && <HistoryScreen key="history" />}
                {screen === 'settings' && <SettingsScreen key="settings" />}
                {screen === 'extensions' && <ExtensionsScreen key="extensions" />}
              </AnimatePresence>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

