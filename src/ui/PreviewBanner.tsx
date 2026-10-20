import { FlaskConical } from 'lucide-react'

export function PreviewBanner() {
  return (
    <div role="note" className="flex items-start gap-2 self-start rounded-card border border-medium-mark/35 bg-note px-4 py-3 text-body text-ink/85">
      <FlaskConical size={16} className="mt-0.5 shrink-0 text-info" aria-hidden />
      <p>
        <strong>Preview with sample values.</strong> These checks need a connection to the building's control system. Nothing here is live or counted in your totals.
      </p>
    </div>
  )
}
