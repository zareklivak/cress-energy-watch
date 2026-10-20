import { ChevronRight, FlaskConical, Upload } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { useMediaQuery } from '../ui/useMediaQuery'
import { NAV } from '../ui/shell/nav'
import { PageHeader } from '../ui/shell/PageHeader'

const ITEMS = [
  ...NAV.filter((n) => ['/budget', '/reports', '/settings'].includes(n.to)),
  { to: '/preview', label: 'With integration (preview)', icon: FlaskConical },
  { to: '/', label: 'Upload new data', icon: Upload },
]

export default function More() {
  // The sidebar shows all of these from 640px up, so More only exists on phones.
  const wide = useMediaQuery('(min-width: 640px)')
  if (wide) return <Navigate to="/overview" replace />
  return (
    <>
      <PageHeader title="More" />
      <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-card">
        {ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 px-4 py-3.5 text-lead font-medium hover:bg-sunk">
              <Icon size={18} className="text-accent" aria-hidden />
              <span className="flex-1">{label}</span>
              <ChevronRight size={16} className="text-mute" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}
