import type { ScoreResult, ScoreSnapshot } from '../types'
import { scoreLabel } from '../lib/score'

function scoreColor(score: number): string {
  if (score >= 65) return 'text-ok'
  if (score >= 45) return 'text-warn'
  return 'text-bad'
}

function barColor(pct: number): string {
  if (pct >= 0.7) return 'bg-ok'
  if (pct >= 0.4) return 'bg-warn'
  return 'bg-bad'
}

interface Props {
  result: ScoreResult
  history?: ScoreSnapshot[]
  compact?: boolean
}

export default function ScoreCard({ result, history = [], compact = false }: Props) {
  const prev = history.length >= 2 ? history[history.length - 2] : null
  const delta = prev ? result.total - prev.score : 0

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-line p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
            Financial Health Score
          </h2>
          <div className="flex items-baseline gap-3 mt-2">
            <span className={`font-display text-7xl font-bold tracking-tight tabular-nums leading-none ${scoreColor(result.total)}`}>{result.total}</span>
            <span className="text-ink-faint text-lg">/100</span>
            <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-medium text-ink-mid">{scoreLabel(result.total)}</span>
          </div>
          {prev && delta !== 0 && (
            <p className="mt-2 text-sm text-ink-mid">
              {delta > 0 ? (
                <>You moved from {prev.score} → {result.total}. Nice, here's what's moving the needle.</>
              ) : (
                <>Down from {prev.score} → {result.total}. Let's see what shifted.</>
              )}
            </p>
          )}
          {!prev && history.length <= 1 && (
            <p className="mt-2 text-xs text-ink-faint">
              This is your starting point. Small moves compound from here.
            </p>
          )}
        </div>
      </div>

      {!compact && (
        <>
          <div className="mt-6 space-y-4">
            {result.categories.map((c) => (
              <div key={c.key}>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-mid">{c.label}</span>
                  <span className="font-medium text-ink tabular-nums">
                    {c.points}/{c.max}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor(c.points / c.max)}`}
                    style={{ width: `${Math.max((c.points / c.max) * 100, 4)}%` }}
                  />
                </div>
                <p className="mt-0.5 text-xs text-ink-faint">{c.note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-brand-soft border border-brand-line p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
              Your one move
            </div>
            <p className="mt-1 text-sm text-brand-ink">{result.priorityAction}</p>
          </div>
        </>
      )}
    </div>
  )
}
