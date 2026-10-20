import { Link } from 'react-router-dom'
import { monthLong } from '../engine/format'
import { DEFAULT_LABELS, METERS } from '../engine/types'
import { SAMPLE, useApp } from '../state/store'
import { Button } from '../ui/Button'
import { toast } from '../ui/Toast'
import { Card, MicroLabel } from '../ui/Card'
import { PageHeader } from '../ui/shell/PageHeader'

export default function Settings() {
  const { state, dispatch, rows } = useApp()
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <Card>
            <MicroLabel>Property</MicroLabel>
            <p className="mt-2 text-lead font-semibold">Silver Pine Lodge</p>
            <p className="text-body text-mute">1200 Silver Pine Way, Truckee, CA</p>
            <p className="mt-2 text-body">Utility: natural gas · 8 meters</p>
          </Card>
          <Card>
            <MicroLabel>Data</MicroLabel>
            <p className="mt-2 text-body font-semibold">{state.dataset.fileName}</p>
            {state.dataset.readByAi && <p className="mt-1 text-meta text-ink/70">Read with AI from the uploaded file.</p>}
            <p className="text-body text-mute">{monthLong(rows[0].month)} to {monthLong(rows[rows.length - 1].month)} · {rows.length} months</p>
            {state.dataset.warnings.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-meta text-medium">{state.dataset.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/" className="inline-flex items-center rounded-full border border-line bg-card px-4 py-2 text-body font-semibold hover:border-ink/40">Upload different data</Link>
              {state.dataset.source !== 'sample' && <Button onClick={() => { dispatch({ type: 'load', dataset: SAMPLE }); toast('Sample data loaded') }}>Reload sample data</Button>}
            </div>
          </Card>
        </div>
        <Card>
          <MicroLabel>Meter names</MicroLabel>
          <p className="mt-1 text-body text-mute">Name each meter for what it serves. Names carry through every screen for this session.</p>
          <ul className="mt-4 grid gap-x-4 gap-y-3 lg:grid-cols-2">
            {[...METERS].sort((a, b) => (a === 'pool' ? 1 : b === 'pool' ? -1 : a.localeCompare(b))).map((m) => {
              const unnamed = state.labels[m].trim() === '' || (state.labels[m] === DEFAULT_LABELS[m] && m !== 'pool')
              return (
                <li key={m}>
                  <label className="block text-meta font-semibold text-ink/80" htmlFor={`label-${m}`}>{DEFAULT_LABELS[m]}{unnamed && <span className="font-normal text-mute"> · not named yet</span>}</label>
                  <input
                    id={`label-${m}`}
                    value={state.labels[m]}
                    maxLength={40}
                    placeholder="e.g. Main kitchen"
                    onChange={(e) => dispatch({ type: 'setLabel', meter: m, label: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-body focus-visible:border-accent"
                  />
                </li>
              )
            })}
          </ul>
        </Card>
      </div>
    </>
  )
}
