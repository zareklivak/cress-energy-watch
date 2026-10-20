import clsx from 'clsx'
import { FileSpreadsheet } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useRef, useState, type DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { readUpload, type UploadOutcome } from '../state/loadFile'
import { SAMPLE, useApp, type Dataset } from '../state/store'
import { Brand } from '../ui/Brand'
import { Button } from '../ui/Button'
import { StepStrip, type StepState } from '../ui/StepStrip'
import { CheckPanel } from './upload/CheckPanel'

const STEPS = ['Reading bills', 'Learning normal', 'Finding anomalies']

const NO_MORE_NOW = [
  { before: 'No more finding out after the bill is paid.', after: 'Now every meter is checked against its own normal.' },
  { before: 'No more guessing why a month jumped.', after: 'Now each flag comes with the likely reason and a next step.' },
  { before: 'No more rebuilding the board packet by hand.', after: 'Now the monthly summary is ready to print.' },
]

export default function Upload() {
  const { dispatch } = useApp()
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  const input = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState(-1) // -1 idle, 0..2 running, 3 done
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [check, setCheck] = useState<Extract<UploadOutcome, { kind: 'check' }> | null>(null)

  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
  const step = reduced ? 250 : 1300

  /** "Learning normal" and "Finding anomalies", then the Overview. */
  async function analyze(dataset: Dataset) {
    setPhase(1) // the provider computes normal ranges when the data loads
    await pause(step)
    setPhase(2)
    dispatch({ type: 'load', dataset })
    await pause(step)
    setPhase(3)
    navigate('/overview')
  }

  async function run(get: () => Promise<UploadOutcome>) {
    setError(null)
    setCheck(null)
    try {
      setPhase(0)
      const out = await get() // "Reading bills" (and the AI reader when needed)
      await pause(step)
      if (out.kind === 'check') {
        setPhase(-1)
        setCheck(out)
      } else await analyze(out.dataset)
    } catch (e) {
      setPhase(-1)
      setError(e instanceof Error ? e.message : 'Something went wrong reading that file.')
    }
  }

  const state = (i: number): StepState => (phase > i ? 'done' : phase === i ? 'active' : 'todo')
  const busy = phase >= 0
  const onFile = (file: File | undefined) => file && !busy && !check && run(() => readUpload(file))
  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    onFile(e.dataTransfer.files[0])
  }

  return (
    <div className="min-h-screen bg-page">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-14">
        <Brand />
        <h1 className="mt-10 text-display font-semibold leading-[1.1] tracking-tight text-balance sm:text-hero">Know why the gas bill moved before the board asks.</h1>
        <p className="mt-4 max-w-xl text-lead leading-relaxed text-ink/75">
          Drop in your utility sheet. Cress checks every meter against its own history, the season and the weather, then explains what changed in plain English.
        </p>

        <section
          aria-label="Upload"
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={clsx('mt-8 rounded-card border-2 border-dashed bg-card p-6 text-center transition sm:p-10', dragging ? 'border-accent bg-accent-soft' : 'border-line')}
        >
          {check ? (
            <CheckPanel
              dataset={check.dataset}
              notes={check.notes}
              onUse={() => { const d = check.dataset; setCheck(null); setPhase(0); analyze(d) }}
              onRetry={() => setCheck(null)}
            />
          ) : busy ? (
            <div className="py-4">
              <div aria-live="polite"><StepStrip steps={STEPS.map((label, i) => ({ label, state: state(i) }))} /></div>
              {phase === 0 && <p className="mt-3 text-meta text-ink/70">Messy files and PDFs are read with AI. This can take up to a minute.</p>}
            </div>
          ) : (
            <>
              <FileSpreadsheet size={32} className="mx-auto text-accent" aria-hidden />
              <p className="mt-3 text-title font-semibold text-balance">Drop your utility spreadsheet or bill PDFs</p>
              <p className="mt-1 text-body text-ink/70">CSV, Excel or PDF. If it isn't in our format, Cress reads it with AI and shows you what it found.</p>
              <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
                <Button variant="primary" onClick={() => run(async () => ({ kind: 'ready', dataset: SAMPLE }))}>Use sample data</Button>
                <Button onClick={() => input.current?.click()}>Choose a file</Button>
              </div>
              <input ref={input} type="file" accept=".csv,.pdf,.xlsx,.xls" className="sr-only" aria-label="Choose a utility file" onChange={(e) => onFile(e.target.files?.[0])} />
            </>
          )}
          {error && <p role="alert" className="mt-5 rounded-xl border border-high/30 bg-high-soft px-4 py-3 text-left text-body text-high">{error}</p>}
        </section>

        <ul className="mt-10 grid gap-5 sm:grid-cols-3">
          {NO_MORE_NOW.map((x) => (
            <li key={x.before} className="border-t border-line pt-4">
              <p className="text-body text-mute">{x.before}</p>
              <p className="mt-2 text-lead font-semibold leading-snug"><span className="text-accent">Now</span>{x.after.slice(3)}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
