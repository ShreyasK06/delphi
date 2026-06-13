import { useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'

export interface TabItem {
  id: string
  label: string
}

interface TabsProps {
  tabs: TabItem[]
  activeId: string
  onChange: (id: string) => void
  children: ReactNode
}

/**
 * Accessible tab bar. Uses roving-tabindex so arrow keys move focus between
 * tabs; Enter/Space activate the focused tab. The content panel matching the
 * active tab is shown via a render prop pattern: wrap each panel in a
 * <TabPanel> component and pass the panel collection as children.
 *
 * Visual style: underline active indicator using brand token.
 * Mobile: horizontally scrollable tab row.
 */
export default function Tabs({ tabs, activeId, onChange, children }: TabsProps) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = index
    if (e.key === 'ArrowRight') {
      next = (index + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      next = (index - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      next = 0
    } else if (e.key === 'End') {
      next = tabs.length - 1
    } else {
      return
    }
    e.preventDefault()
    onChange(tabs[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <div>
      {/* Tab row */}
      <div
        role="tablist"
        className="flex overflow-x-auto gap-0 border-b border-line -mb-px scrollbar-none"
        aria-label="Section tabs"
      >
        {tabs.map((tab, i) => {
          const isActive = tab.id === activeId
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              ref={(el) => { tabRefs.current[i] = el }}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={[
                'shrink-0 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                isActive
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-mid hover:text-ink hover:border-line-strong',
              ].join(' ')}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panels */}
      <div className="pt-5">{children}</div>
    </div>
  )
}

interface TabPanelProps {
  id: string
  activeId: string
  children: ReactNode
}

/**
 * Wraps a tab panel. Hidden when its id does not match activeId.
 */
export function TabPanel({ id, activeId, children }: TabPanelProps) {
  if (id !== activeId) return null
  return (
    <div
      id={`panel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className="focus:outline-none"
    >
      {children}
    </div>
  )
}
