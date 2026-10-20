import { ChevronDown, X } from 'lucide-react'
import { useState } from 'react'

const KEY = 'cress.howto.dismissed'
const read = () => { try { return localStorage.getItem(KEY) === '1' } catch { return false } }

/** A one-line "New here?" strip that expands into the short explainer. Dismissal is remembered per browser. */
export function HowTo() {
  const [hidden, setHidden] = useState(read)
  const [open, setOpen] = useState(false)
  if (hidden) return null
  const dismiss = () => { try { localStorage.setItem(KEY, '1') } catch { /* private mode: hide for this visit only */ } setHidden(true) }
  return (
    <section aria-label="How this works" className="no-print mb-5 rounded-card border border-line bg-card">
      <div className="flex items-center gap-2 px-4 py-2">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-h-9 flex-1 items-center gap-2 text-left text-body">
          <span className="font-semibold">New here?</span>
          <span className="text-ink/75">How this works</span>
          <ChevronDown size={16} aria-hidden className={`text-mute transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <button type="button" onClick={dismiss} aria-label="Hide how this works" className="rounded-full p-2 text-mute hover:bg-sunk hover:text-ink"><X size={16} aria-hidden /></button>
      </div>
      {open && (
        <div className="border-t border-line px-4 pb-4 pt-3 sm:px-5">
          <ol className="grid gap-x-6 gap-y-1.5 text-body leading-relaxed text-ink/85 sm:grid-cols-3">
            <li><strong>1. Upload</strong> your gas sheet: CSV, Excel or PDF.</li>
            <li><strong>2. Read</strong> the month&rsquo;s story here.</li>
            <li><strong>3. Check</strong> each flag in Anomalies, then mark it expected, add a note or create a task.</li>
          </ol>
          <p className="mt-2 text-meta leading-relaxed text-ink/75">Budget and Reports turn that into next season&rsquo;s plan and a one-page board summary. This version works from your uploaded bills. Later, it can connect straight to your building&rsquo;s systems for live, equipment-level checks.</p>
        </div>
      )}
    </section>
  )
}
