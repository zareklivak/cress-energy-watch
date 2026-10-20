import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

/** Modal sheet built on <dialog>: Esc and the close button both call onClose. */
export function Sheet({ open, title, onClose, children, size = 'md' }: { open: boolean; title: string; onClose: () => void; children: ReactNode; size?: 'md' | 'wide' }) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby={titleId}
      className={`m-auto ${size === 'wide' ? 'w-[min(96vw,1200px)]' : 'w-[min(92vw,440px)]'} rounded-card border border-line bg-card p-0 text-ink shadow-xl backdrop:bg-ink/30 transition-[opacity,transform,overlay,display] transition-discrete duration-200 starting:open:scale-95 starting:open:opacity-0`}
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 id={titleId} className="text-lead font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="flex min-h-10 min-w-10 items-center justify-center rounded-full text-mute hover:bg-sunk">
          <X size={18} aria-hidden />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  )
}
