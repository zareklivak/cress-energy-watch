import clsx from 'clsx'
import { FlaskConical, Upload } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { monthShort } from '../../engine/format'
import { useApp } from '../../state/store'
import { Brand } from '../Brand'
import { NAV } from './nav'
import { PropertySwitcher } from './PropertySwitcher'

const itemCls = ({ isActive }: { isActive: boolean }) =>
  clsx('flex items-center gap-2.5 rounded-xl px-3 py-2 text-body font-medium transition', isActive ? 'bg-accent-soft text-accent' : 'text-ink/75 hover:bg-sunk hover:text-ink')

export function Sidebar() {
  const { openFlags, rows, state } = useApp()
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-5 border-r border-line bg-sidebar px-4 py-5 sm:flex">
      <Link to="/overview" aria-label="Cress Energy Watch home"><Brand /></Link>
      <PropertySwitcher />
      <nav aria-label="Main" className="flex flex-col gap-0.5">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={itemCls}>
            <Icon size={17} aria-hidden />
            <span className="flex-1">{label}</span>
            {to === '/anomalies' && openFlags.length > 0 && <span className="num rounded-full bg-high-soft px-1.5 text-caption font-semibold text-high">{openFlags.length}</span>}
          </NavLink>
        ))}
        <div className="my-2 border-t border-line" />
        <NavLink to="/preview" className={itemCls}>
          <FlaskConical size={17} className="shrink-0" aria-hidden />
          <span className="flex-1 whitespace-nowrap">With integration</span>
          <span className="pr-1 text-micro font-semibold uppercase tracking-wide text-info">Preview</span>
        </NavLink>
      </nav>
      <div className="mt-auto space-y-2 text-caption text-mute">
        <p>Gas · {monthShort(rows[0].month)} {rows[0].month.slice(0, 4)} to {monthShort(rows[rows.length - 1].month)} {rows[rows.length - 1].month.slice(0, 4)}{state.dataset.source === 'sample' && ' · Sample data'}</p>
        <Link to="/" className="inline-flex items-center gap-1.5 font-semibold text-accent hover:underline"><Upload size={14} aria-hidden />Upload new data</Link>
      </div>
    </aside>
  )
}
