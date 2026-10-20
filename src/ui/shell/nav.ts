import { FileText, Flag, Gauge, LayoutDashboard, PiggyBank, Settings, type LucideIcon } from 'lucide-react'

export const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/overview', label: 'Overview', icon: LayoutDashboard },
  { to: '/anomalies', label: 'Anomalies', icon: Flag },
  { to: '/meters', label: 'Meters', icon: Gauge },
  { to: '/budget', label: 'Budget', icon: PiggyBank },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/settings', label: 'Settings', icon: Settings },
]
