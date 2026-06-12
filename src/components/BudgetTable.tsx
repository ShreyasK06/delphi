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
  return (
    <tr className="border-t border-line">
      <td className="py-2.5 pr-3 text-ink-mid">{row.label}</td>
      <td className="py-2.5 pr-3 text-right font-medium text-ink">{fmtMoney(row.actual)}</td>
      <td className="py-2.5 pr-3 text-right text-ink-faint">{fmtMoney(row.target)}</td>
      <td className="py-2.5 pr-3 text-right text-ink-faint">{Math.round(row.share * 100)}%</td>
      <td className="py-2.5 text-right">
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
        <span className={`text-sm font-medium ${budget.leftover >= 0 ? 'text-ok' : 'text-bad'}`}>
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
    </div>
  )
}
