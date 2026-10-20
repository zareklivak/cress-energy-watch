import clsx from 'clsx'
import { Flag, Gauge, LayoutDashboard, Menu } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useApp } from '../../state/store'

const TABS = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/anomalies', label: 'Anomalies', icon: Flag },
  { to: '/meters', label: 'Meters', icon: Gauge },
  { to: '/more', label: 'More', icon: Menu },
]

export function BottomTabs() {
  const { openFlags } = useApp()
  const { pathname } = useLocation()
  // Pages reached through More (Budget, Reports, Settings, Preview) keep the More tab lit.
  const viaMore = ['/budget', '/reports', '/settings', '/preview'].some((p) => pathname.startsWith(p))
  return (
    <nav aria-label="Main" className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => clsx('relative flex flex-col items-center gap-0.5 py-2 text-micro font-medium', isActive || (to === '/more' && viaMore) ? 'text-accent' : 'text-mute')}>
          <Icon size={20} aria-hidden />
          {label}
          {to === '/anomalies' && openFlags.length > 0 && <span className="num absolute right-[22%] top-1 rounded-full bg-high px-1.5 text-micro font-bold text-white">{openFlags.length}</span>}
        </NavLink>
      ))}
    </nav>
  )
}
