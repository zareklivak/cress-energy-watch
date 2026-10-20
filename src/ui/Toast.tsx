import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

type Listener = (message: string) => void
const listeners = new Set<Listener>()

/** Show a short confirmation ("Marked resolved"). Safe to call from any event handler. */
export function toast(message: string) {
  listeners.forEach((l) => l(message))
}

/** Renders the latest toast for 2.5s. Mounted once in the app shell. */
export function Toaster() {
  const [message, setMessage] = useState<string | null>(null)
  const [stamp, setStamp] = useState(0)
  useEffect(() => {
    const l: Listener = (m) => { setMessage(m); setStamp((s) => s + 1) }
    listeners.add(l)
    return () => { listeners.delete(l) }
  }, [])
  useEffect(() => {
    if (!message) return
    const id = setTimeout(() => setMessage(null), 2500)
    return () => clearTimeout(id)
  }, [message, stamp])
  return (
    <div role="status" aria-live="polite" className="no-print pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-6">
      {message && (
        <p key={stamp} className="flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-body font-medium text-white shadow-lg motion-safe:animate-[toast-in_0.2s_ease-out]">
          <Check size={16} aria-hidden />{message}
        </p>
      )}
    </div>
  )
}
