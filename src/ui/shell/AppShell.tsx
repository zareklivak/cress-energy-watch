import { motion, useReducedMotion } from 'motion/react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Brand } from '../Brand'
import { BottomTabs } from './BottomTabs'
import { Toaster } from '../Toast'
import { Sidebar } from './Sidebar'

export function AppShell() {
  const { pathname } = useLocation()
  const reduced = useReducedMotion()
  return (
    <div className="flex min-h-screen bg-page">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to main content</a>
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="no-print flex items-center justify-between border-b border-line bg-sidebar px-4 py-3 sm:hidden">
          <Link to="/overview" aria-label="Cress Energy Watch home"><Brand /></Link>
          <span className="truncate text-meta font-semibold text-mute">Silver Pine Lodge</span>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1180px] [overflow-wrap:anywhere] px-4 pb-28 pt-5 sm:px-8 sm:pb-12 sm:pt-8">
          <motion.div key={pathname} initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            <Outlet />
          </motion.div>
        </main>
      </div>
      <BottomTabs />
      <Toaster />
    </div>
  )
}
