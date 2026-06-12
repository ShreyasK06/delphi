import type { BudgetRow, BudgetSummary } from '../lib/budget'
import { fmtMoney } from '../types'

const statusStyles: Record<BudgetRow['status'], string> = {
  'on-track': 'bg-ok-soft text-ok-ink',
  over: 'bg-bad-soft text-bad-ink',
  under: 'bg-info-soft text-info-ink',
}

const statusLabel: Record<BudgetRow['status'], string> = {
  'on-track': 'On track',
  over: 'Over',
  under: 'Under',
}

function Row({ row, goodWhenHigh = false }: { row: BudgetRow; goodWhenHigh?: boolean }) {
  // For savings, "under target" is the bad state and over is fine.
  const display =
    goodWhenHigh && row.status === 'under'
      ? { cls: 'bg-warn-soft text-warn-ink', label: 'Below target' }
      : { cls: statusStyles[row.status], label: statusLabel[row.status] }
  const pctOfTarget = row.target > 0 ? Math.min(row.actual / row.target, 1.5) : 0
  const barCls =
    goodWhenHigh
      ? row.status === 'under' ? 'bg-warn' : 'bg-ok'
      : row.status === 'over' ? 'bg-bad' : row.status === 'under' ? 'bg-info' : 'bg-ok'
  return (
    <tr className="border-t border-line">
      <td className="py-3 pr-3 text-ink-mid">
        {row.label}
        <div className="mt-1.5 h-1 w-full max-w-[8rem] rounded-full bg-surface-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${barCls} transition-all duration-300`}
            style={{ width: `${Math.max(Math.min((pctOfTarget / 1.5) * 100, 100), 3)}%` }}
          />
        </div>
      </td>
      <td className="py-3 pr-3 text-right font-medium text-ink tabular-nums">{fmtMoney(row.actual)}</td>
      <td className="py-3 pr-3 text-right text-ink-faint tabular-nums">{fmtMoney(row.target)}</td>
      <td className="py-3 pr-3 text-right text-ink-faint tabular-nums">{Math.round(row.share * 100)}%</td>
      <td className="py-3 text-right">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${display.cls}`}>
          {display.label}
        </span>
      </td>
    </tr>
  )
}

export default function BudgetTable({ budget, detailed = false }: { budget: BudgetSummary; detailed?: boolean }) {
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-line p-6 overflow-x-auto">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
          {detailed ? 'Category detail' : 'Monthly budget, 50/30/20, college edition'}
        </h2>
        <span className={`text-sm font-medium tabular-nums ${budget.leftover >= 0 ? 'text-ok' : 'text-bad'}`}>
          {budget.leftover >= 0
            ? `${fmtMoney(budget.leftover)} left each month`
            : `${fmtMoney(-budget.leftover)} over budget`}
        </span>
      </div>
      <table className="w-full mt-3 text-sm">
        <thead>
          <tr className="text-xs text-ink-faint uppercase tracking-wide">
            <th className="text-left font-medium pb-1">Category</th>
            <th className="text-right font-medium pb-1">Actual</th>
            <th className="text-right font-medium pb-1">Target</th>
            <th className="text-right font-medium pb-1">% income</th>
            <th className="text-right font-medium pb-1">Status</th>
          </tr>
        </thead>
        <tbody>
          {detailed ? (
            budget.rows.map((r) => <Row key={r.label} row={r} />)
          ) : (
            <>
              <Row row={budget.needs} />
              <Row row={budget.wants} />
              <Row row={budget.savingsDebt} goodWhenHigh />
            </>
          )}
        </tbody>
      </table>
      {detailed && (
        <p className="mt-3 text-xs text-ink-faint">
          Rent and utilities are mostly fixed. Food, going out, and subscriptions are where month-to-month changes actually happen.
        </p>
      )}
    </div>
  )
}
