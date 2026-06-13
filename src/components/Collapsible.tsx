import { useState, useId } from 'react'
import type { ReactNode } from 'react'

interface CollapsibleProps {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
  /** When true, force open regardless of internal state (for search bypass). */
  forceOpen?: boolean
}

/**
 * Accessible accordion item.
 * Animates open/closed with the CSS grid-template-rows 0fr/1fr trick so no
 * JS height measurement is needed. The chevron rotates 180 deg when open.
 * aria-expanded is set on the trigger button.
 */
export default function Collapsible({
  title,
  summary,
  defaultOpen = false,
  children,
  forceOpen,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const isOpen = forceOpen !== undefined ? forceOpen : open

  return (
    <div className="bg-surface rounded-2xl border border-line overflow-hidden">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-surface-2 hover:text-brand transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
      >
        <div className="min-w-0">
          <span className="block font-semibold text-sm text-ink leading-snug">{title}</span>
          {summary && !isOpen && (
            <span className="block text-xs text-ink-faint mt-0.5 truncate">{summary}</span>
          )}
        </div>
        {/* Inline chevron SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={[
            'shrink-0 text-ink-faint transition-transform duration-200',
            isOpen ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        >
          <polyline points="3 6 8 11 13 6" />
        </svg>
      </button>

      {/* Grid-rows animation trick */}
      <div
        id={id}
        className="grid transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line px-5 pb-5 pt-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
