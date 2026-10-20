import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { usd } from '../engine/format'
import { useApp } from '../state/store'
import { Button } from '../ui/Button'
import { Card, MicroLabel } from '../ui/Card'
import { SEV_COLOR } from '../ui/charts/chartData'
import { ChartFor } from '../ui/charts/ChartFor'
import { CONFIDENCE, fmtWhen } from '../ui/labels'
import { NumberedSteps } from '../ui/NumberedSteps'
import { MeterChip, SeverityPill, StatusPill } from '../ui/Pill'
import { Sheet } from '../ui/Sheet'
import { toast } from '../ui/Toast'
import NotFound from './NotFound'

type SheetKind = 'expected' | 'task' | 'note' | null

const field = 'mt-1 w-full rounded-xl border border-line bg-card px-3 py-2 text-body focus-visible:border-accent'

export default function Detail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { findings, findingById, state, dispatch, label } = useApp()
  const [sheet, setSheet] = useState<SheetKind>(null)
  const f = id ? findingById(id) : undefined
  if (!f) return <NotFound message="This flag isn't in the current data." />

  const order = findings.map((x) => x.id)
  const at = order.indexOf(f.id)
  const activity = state.activity.filter((a) => a.findingId === f.id)
  const isExpected = f.status === 'expected'

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const text = (k: string) => String(data.get(k) ?? '').trim()
    if (sheet === 'expected') { dispatch({ type: 'setStatus', id: f.id, status: 'expected', reason: text('reason') }); toast('Marked as expected') }
    if (sheet === 'note' && text('note')) { dispatch({ type: 'addNote', id: f.id, text: text('note') }); toast('Note added') }
    if (sheet === 'task') { dispatch({ type: 'addTask', task: { findingId: f.id, what: text('what') || f.nextStep, who: text('who'), due: text('due') } }); toast('Task created') }
    setSheet(null)
  }

  // Billing mismatches: every month is "what happened"; the reasoning is the shared conclusion.
  const mismatch = f.kind === 'cost-mismatch'
  const steps = [
    { title: 'What happened', body: mismatch ? <ul className="space-y-1">{f.evidence.map((e) => <li key={e}>{e}</li>)}</ul> : f.evidence[0] },
    {
      title: 'Why we think so',
      body: mismatch
        ? 'Calculated and billed cost differ in each month, and no single meter explains the gap.'
        : f.evidence.length > 1
        ? <ul className="list-disc space-y-1 pl-4">{f.evidence.slice(1).map((e) => <li key={e}>{e}</li>)}</ul>
        : CONFIDENCE[f.confidence],
    },
    { title: 'Likely cause', body: f.causes[0]?.text },
  ]

  return (
    <>
      <div className="no-print mb-4 flex items-center justify-between gap-3 text-body">
        <Link to="/anomalies" className="inline-flex items-center gap-1 font-semibold text-accent hover:underline"><ArrowLeft size={16} aria-hidden />Anomalies</Link>
        <div className="flex items-center gap-1 text-mute">
          <button type="button" aria-label="Previous flag" disabled={at <= 0} onClick={() => navigate(`/anomalies/${order[at - 1]}`)} className="rounded-full p-1.5 hover:bg-sunk disabled:opacity-30"><ChevronLeft size={18} /></button>
          <span className="num">{at + 1} of {order.length}</span>
          <button type="button" aria-label="Next flag" disabled={at >= order.length - 1} onClick={() => navigate(`/anomalies/${order[at + 1]}`)} className="rounded-full p-1.5 hover:bg-sunk disabled:opacity-30"><ChevronRight size={18} /></button>
        </div>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityPill severity={f.severity} />
          {f.meters.length > 2 ? <MeterChip>{f.meters.length} meters</MeterChip> : f.meters.map((m) => <MeterChip key={m}>{label(m)}</MeterChip>)}
          <StatusPill status={f.status} />
        </div>
        <h1 className="mt-2 text-stat font-semibold leading-tight tracking-tight text-balance sm:text-display">{f.headline}</h1>
        {f.impactUsd !== null ? (
          <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
            <span className={`num text-figure font-semibold ${f.severity === 'high' ? 'text-high' : 'text-ink'}`}>{usd(f.impactUsd)}</span>
            <span className="text-body text-mute">{f.impactLabel} · {CONFIDENCE[f.confidence].toLowerCase()}</span>
          </p>
        ) : (
          <p className="mt-2 text-body text-mute">Expected behavior · no cost impact</p>
        )}
      </header>

      <section aria-label="Next step" className="mt-5 rounded-card border border-accent/25 bg-accent-soft/60 p-4 sm:p-5">
        <MicroLabel className="text-accent">Next step</MicroLabel>
        <p className="mt-1.5 max-w-3xl text-lead font-medium leading-relaxed">{f.nextStep}</p>
        <div className="no-print mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button variant={isExpected ? 'secondary' : 'primary'} className="col-span-2 sm:col-span-1" onClick={() => setSheet('task')}>Create task</Button>
          {isExpected
            ? <Button onClick={() => { dispatch({ type: 'setStatus', id: f.id, status: 'new' }); toast('Reopened') }}>Reopen</Button>
            : <Button onClick={() => setSheet('expected')}>Mark expected</Button>}
          {f.status !== 'resolved' && !isExpected && <Button onClick={() => { dispatch({ type: 'setStatus', id: f.id, status: 'resolved' }); toast('Marked resolved') }}>Mark resolved</Button>}
          <Button onClick={() => setSheet('note')}>Add note</Button>
        </div>
      </section>

      <div className="mt-4"><NumberedSteps steps={steps} /></div>

      <Card className="mt-4"><ChartFor finding={f} /></Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <MicroLabel>Likely causes</MicroLabel>
          <ul className="mt-3 space-y-3">
            {f.causes.map((c) => (
              <li key={c.text} className="flex items-center gap-3 text-body">
                <span className="flex-1">{c.text}</span>
                <span className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-sunk" aria-hidden>
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${c.weight * 100}%` }} />
                </span>
                <span className="num w-9 shrink-0 text-right text-meta text-ink/70">{Math.round(c.weight * 100)}%</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <MicroLabel>Activity</MicroLabel>
          <ol className="mt-3 space-y-2.5 text-body">
            <li className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: isExpected ? 'var(--color-mute)' : SEV_COLOR[f.severity] }} /><span><strong>{isExpected ? 'Noted by Cress' : 'Flagged by Cress'}</strong> <span className="text-mute">· {fmtWhen(state.dataset.analyzedAt)}</span></span></li>
            {activity.map((a) => (
              <li key={a.id} className="flex gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-mute/50" /><span>{a.text} <span className="text-mute">· {fmtWhen(a.at)}</span></span></li>
            ))}
          </ol>
        </Card>
      </div>

      <Sheet open={sheet !== null} onClose={() => setSheet(null)} title={sheet === 'task' ? 'Create task' : sheet === 'note' ? 'Add note' : 'Mark expected'}>
        <form onSubmit={submit} className="space-y-3 text-body">
          {sheet === 'task' && (
            <>
              <label className="block font-medium">What<textarea name="what" defaultValue={f.nextStep} rows={3} className={field} /></label>
              <label className="block font-medium">Who<input name="who" placeholder="e.g. Maintenance lead" className={field} /></label>
              <label className="block font-medium">Due<input name="due" type="date" className={field} /></label>
            </>
          )}
          {sheet === 'note' && <label className="block font-medium">Note<textarea name="note" rows={4} required className={field} /></label>}
          {sheet === 'expected' && <label className="block font-medium">Why is this expected?<input name="reason" placeholder="e.g. Pool heater ran for the spring event" className={field} /></label>}
          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={() => setSheet(null)}>Cancel</Button>
            <Button type="submit" variant="primary">Save</Button>
          </div>
        </form>
      </Sheet>
    </>
  )
}
