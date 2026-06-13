import { useState, useEffect, useRef, useCallback } from 'react'
import { useProfile } from '../hooks/useProfile'
import { fmtMoneyCents } from '../types'
import type { Holding, AssetType } from '../types'
import {
  getQuotes,
  getHistory,
  searchSymbols,
  getRecommendations,
} from '../lib/stocks'
import type { Quote, HistoryPoint, SymbolResult, Recommendation } from '../lib/stocks'
import PageNav from '../components/PageNav'
import Collapsible from '../components/Collapsible'
import { SearchIcon, TrendUpIcon } from '../components/icons'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return fmtMoneyCents(n)
}

function fmtPct(n: number) {
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

function gainClass(n: number) {
  return n >= 0 ? 'text-ok-ink' : 'text-bad-ink'
}

function AssetBadge({ type }: { type: AssetType }) {
  const styles: Record<AssetType, string> = {
    stock: 'bg-brand-soft text-brand-ink',
    etf: 'bg-info-soft text-info-ink',
    crypto: 'bg-warn-soft text-warn-ink',
  }
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

function BackendNotice() {
  return (
    <div className="rounded-xl bg-warn-soft border border-warn-line px-4 py-3 text-sm text-warn-ink">
      <p className="font-semibold mb-1">Market data is unavailable right now.</p>
      <p>
        Add your free API keys to{' '}
        <code className="font-mono bg-warn-line/40 rounded px-1 py-0.5 text-xs">.env.local</code>:{' '}
        <code className="font-mono bg-warn-line/40 rounded px-1 py-0.5 text-xs">
          VITE_FINNHUB_API_KEY
        </code>{' '}
        (finnhub.io, for quotes and search) and{' '}
        <code className="font-mono bg-warn-line/40 rounded px-1 py-0.5 text-xs">
          VITE_TWELVEDATA_API_KEY
        </code>{' '}
        (twelvedata.com, for trend charts and crypto), then restart the dev server. If they are
        already set, you may have hit a free rate limit, wait a minute and refresh.
      </p>
    </div>
  )
}

// ── Inline SVG trend chart ────────────────────────────────────────────────────

interface TrendChartProps {
  points: HistoryPoint[]
  buyPrice: number
}

function TrendChart({ points, buyPrice }: TrendChartProps) {
  if (points.length < 2) {
    return <p className="text-xs text-ink-faint">Not enough data to draw a chart.</p>
  }

  const W = 600
  const H = 140
  const PAD = { top: 12, right: 8, bottom: 24, left: 8 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const closes = points.map((p) => p.close)
  const allVals = [...closes, buyPrice]
  const minV = Math.min(...allVals)
  const maxV = Math.max(...allVals)
  const range = maxV - minV || 1

  const toX = (i: number) => PAD.left + (i / (points.length - 1)) * innerW
  const toY = (v: number) => PAD.top + (1 - (v - minV) / range) * innerH

  const polyPoints = points.map((p, i) => `${toX(i)},${toY(p.close)}`).join(' ')
  const areaPoints = [
    `${toX(0)},${PAD.top + innerH}`,
    ...points.map((p, i) => `${toX(i)},${toY(p.close)}`),
    `${toX(points.length - 1)},${PAD.top + innerH}`,
  ].join(' ')

  const lastClose = closes[closes.length - 1]
  const positive = lastClose >= buyPrice
  const refY = toY(buyPrice)

  const startDate = points[0].date.slice(0, 10)
  const endDate = points[points.length - 1].date.slice(0, 10)
  const pctChange = ((lastClose - buyPrice) / buyPrice) * 100

  const areaColor = positive ? 'var(--color-ok-soft)' : 'var(--color-bad-soft)'
  const lineColor = positive ? 'var(--color-ok)' : 'var(--color-bad)'

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        aria-hidden="true"
      >
        {/* Area fill */}
        <polygon points={areaPoints} fill={areaColor} opacity="0.6" />
        {/* Line */}
        <polyline
          points={polyPoints}
          fill="none"
          stroke={lineColor}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Reference line at buy price */}
        <line
          x1={PAD.left}
          y1={refY}
          x2={PAD.left + innerW}
          y2={refY}
          stroke="var(--color-ink-faint)"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
        {/* Buy price label */}
        <text
          x={PAD.left + 2}
          y={refY - 3}
          fontSize="9"
          fill="var(--color-ink-faint)"
          fontFamily="var(--font-sans)"
        >
          buy {fmt(buyPrice)}
        </text>
      </svg>
      <p className="text-xs text-ink-faint">
        {startDate} to {endDate}&nbsp;&middot;&nbsp;
        <span className={gainClass(pctChange)}>
          {fmtPct(pctChange)} since purchase
        </span>
      </p>
    </div>
  )
}

// ── Lazy-loaded trend content (fetches once on first reveal) ──────────────────

interface TrendLazyContentProps {
  loading: boolean
  err: string | null
  history: HistoryPoint[] | null
  buyPrice: number
  onOpen: () => void
}

function TrendLazyContent({
  loading,
  err,
  history,
  buyPrice,
  onOpen,
}: TrendLazyContentProps) {
  const called = useRef(false)
  useEffect(() => {
    if (!called.current) {
      called.current = true
      onOpen()
    }
  }, [onOpen])

  if (loading)
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-ink-faint">
        <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="animate-pulse">Loading history...</span>
      </div>
    )
  if (err) return <p className="text-sm text-bad-ink">{err}</p>
  if (!history) return null
  return <TrendChart points={history} buyPrice={buyPrice} />
}

// ── Trend expander for a single holding ──────────────────────────────────────

interface HoldingTrendProps {
  symbol: string
  buyPrice: number
  purchaseDate: string
}

function HoldingTrend({ symbol, buyPrice, purchaseDate }: HoldingTrendProps) {
  const [history, setHistory] = useState<HistoryPoint[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fetched = useRef(false)

  const load = useCallback(async () => {
    if (fetched.current) return
    fetched.current = true
    setLoading(true)
    try {
      const data = await getHistory(symbol, purchaseDate)
      setHistory(data)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Could not load history.')
    } finally {
      setLoading(false)
    }
  }, [symbol, purchaseDate])

  return (
    <Collapsible
      title="Trend since purchase"
      summary="Price history from your buy date to today"
    >
      <TrendLazyContent
        loading={loading}
        err={err}
        history={history}
        buyPrice={buyPrice}
        onOpen={load}
      />
    </Collapsible>
  )
}

// ── Holding card ─────────────────────────────────────────────────────────────

interface HoldingCardProps {
  holding: Holding
  quote: Quote | undefined
  backendDown: boolean
  onDelete: (id: string) => void
}

function HoldingCard({ holding, quote, backendDown, onDelete }: HoldingCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const currentPrice = quote?.price ?? null
  const currentValue = currentPrice !== null ? currentPrice * holding.shares : null
  const costBasis = holding.buyPrice * holding.shares
  const gainAmt = currentValue !== null ? currentValue - costBasis : null
  const gainPct = gainAmt !== null && costBasis > 0 ? (gainAmt / costBasis) * 100 : null

  return (
    <div className="bg-surface rounded-2xl border border-line p-5 space-y-3">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-display text-base font-bold text-ink">{holding.symbol}</span>
          {holding.name && (
            <span className="text-sm text-ink-faint truncate max-w-[14rem]">{holding.name}</span>
          )}
          <AssetBadge type={holding.assetType} />
        </div>
        <button
          type="button"
          aria-label={`Remove ${holding.symbol}`}
          onClick={() => setConfirmDelete(true)}
          className="shrink-0 text-ink-faint hover:text-bad-ink transition-colors p-1 rounded-lg leading-none text-xl"
        >
          &times;
        </button>
      </div>

      {confirmDelete && (
        <div className="rounded-xl bg-bad-soft border border-bad-line px-4 py-3 text-sm text-bad-ink flex items-center gap-3">
          <span>Remove {holding.symbol}?</span>
          <button
            type="button"
            onClick={() => onDelete(holding.id)}
            className="font-semibold underline hover:no-underline"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="text-ink-faint hover:text-ink"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-ink-faint uppercase tracking-wide">Shares</div>
          <div className="text-sm font-semibold text-ink tabular-nums">
            {holding.shares.toLocaleString('en-US', { maximumFractionDigits: 8 })}
          </div>
        </div>
        <div>
          <div className="text-xs text-ink-faint uppercase tracking-wide">Buy price</div>
          <div className="text-sm font-semibold text-ink tabular-nums">{fmt(holding.buyPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-ink-faint uppercase tracking-wide">
            {backendDown ? 'Cost basis' : 'Current price'}
          </div>
          <div className="text-sm font-semibold text-ink tabular-nums">
            {currentPrice !== null ? fmt(currentPrice) : fmt(costBasis)}
          </div>
          {quote && (
            <div
              className={`text-xs tabular-nums ${gainClass(quote.changePct)}`}
            >
              {fmtPct(quote.changePct)} today
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-ink-faint uppercase tracking-wide">
            {currentValue !== null ? 'Current value' : 'Cost basis'}
          </div>
          <div className="text-sm font-semibold text-ink tabular-nums">
            {currentValue !== null ? fmt(currentValue) : fmt(costBasis)}
          </div>
          {gainAmt !== null && gainPct !== null && (
            <div className={`text-xs tabular-nums ${gainClass(gainAmt)}`}>
              {gainAmt >= 0 ? '+' : ''}
              {fmt(gainAmt)} ({fmtPct(gainPct)})
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-ink-faint">Purchased {holding.purchaseDate}</div>

      {!backendDown && (
        <HoldingTrend
          symbol={holding.symbol}
          buyPrice={holding.buyPrice}
          purchaseDate={holding.purchaseDate}
        />
      )}
    </div>
  )
}

// ── Add Holding form ──────────────────────────────────────────────────────────

interface AddFormProps {
  onAdd: (h: Holding) => void
  backendDown: boolean
  prefill?: { symbol: string; name?: string; assetType: AssetType } | null
  onPrefillConsumed?: () => void
}

function AddHoldingForm({ onAdd, backendDown, prefill, onPrefillConsumed }: AddFormProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [assetType, setAssetType] = useState<AssetType>('stock')
  const [shares, setShares] = useState('')
  const [buyPrice, setBuyPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(today)
  const [searchResults, setSearchResults] = useState<SymbolResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Apply prefill whenever it changes
  useEffect(() => {
    if (!prefill) return
    setSymbol(prefill.symbol)
    setName(prefill.name ?? '')
    setAssetType(prefill.assetType)
    setSearchResults([])
    onPrefillConsumed?.()
  }, [prefill, onPrefillConsumed])

  const handleSymbolChange = (val: string) => {
    const upper = val.toUpperCase()
    setSymbol(upper)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (upper.length < 1) {
      setSearchResults([])
      return
    }
    if (backendDown) return
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const results = await searchSymbols(upper)
        setSearchResults(results.slice(0, 8))
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)
  }

  const pickResult = (r: SymbolResult) => {
    setSymbol(r.symbol)
    setName(r.name)
    setAssetType(r.assetType)
    setSearchResults([])
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!symbol.trim()) { setError('Symbol is required.'); return }
    const sharesNum = parseFloat(shares)
    const buyPriceNum = parseFloat(buyPrice)
    if (!(sharesNum > 0)) { setError('Shares must be greater than 0.'); return }
    if (!(buyPriceNum > 0)) { setError('Buy price must be greater than 0.'); return }
    if (purchaseDate > today) { setError('Purchase date cannot be in the future.'); return }

    const holding: Holding = {
      id: crypto.randomUUID(),
      symbol: symbol.trim().toUpperCase(),
      name: name.trim() || undefined,
      assetType,
      shares: sharesNum,
      buyPrice: buyPriceNum,
      purchaseDate,
    }
    onAdd(holding)
    // Reset form
    setSymbol('')
    setName('')
    setAssetType('stock')
    setShares('')
    setBuyPrice('')
    setPurchaseDate(today)
    setSearchResults([])
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && (
        <p className="rounded-xl bg-bad-soft border border-bad-line px-4 py-2 text-sm text-bad-ink">
          {error}
        </p>
      )}

      {/* Symbol + Search */}
      <div className="relative">
        <label className="block text-xs font-medium text-ink-mid mb-1">Symbol</label>
        <div className="relative flex items-center">
          <input
            type="text"
            value={symbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            placeholder="e.g. AAPL, VOO, BTC-USD"
            autoCapitalize="characters"
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm pr-9 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <SearchIcon className="absolute right-3 w-4 h-4 text-ink-faint pointer-events-none" />
        </div>
        {(searchResults.length > 0 || searchLoading) && (
          <div className="absolute z-10 top-full mt-1 w-full rounded-xl border border-line bg-surface shadow-lg overflow-hidden">
            {searchLoading && (
              <div className="px-4 py-2 text-xs text-ink-faint animate-pulse">Searching...</div>
            )}
            {searchResults.map((r) => (
              <button
                key={r.symbol}
                type="button"
                onClick={() => pickResult(r)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors text-left"
              >
                <span>
                  <span className="font-semibold text-ink">{r.symbol}</span>
                  <span className="ml-2 text-ink-faint">{r.name}</span>
                </span>
                <AssetBadge type={r.assetType} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Asset type */}
      <div>
        <label className="block text-xs font-medium text-ink-mid mb-1">Asset type</label>
        <div className="inline-flex rounded-xl border border-line-strong p-1 gap-1">
          {(['stock', 'etf', 'crypto'] as AssetType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setAssetType(t)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                assetType === t ? 'bg-brand text-on-brand' : 'text-ink-mid hover:text-ink'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Shares, buy price, date */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-ink-mid mb-1">Shares</label>
          <input
            type="number"
            min="0"
            step="any"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-mid mb-1">Buy price per share ($)</label>
          <input
            type="number"
            min="0"
            step="any"
            value={buyPrice}
            onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-mid mb-1">Purchase date</label>
          <input
            type="date"
            max={today}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="w-full rounded-xl border border-line-strong bg-surface px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      <button
        type="submit"
        className="rounded-xl bg-brand text-on-brand px-5 py-2.5 text-sm font-semibold hover:bg-brand-strong transition-colors"
      >
        Add holding
      </button>
    </form>
  )
}

// ── Portfolio summary ─────────────────────────────────────────────────────────

interface PortfolioSummaryProps {
  holdings: Holding[]
  quotes: Quote[]
}

function PortfolioSummary({ holdings, quotes }: PortfolioSummaryProps) {
  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))

  const totalCost = holdings.reduce((s, h) => s + h.buyPrice * h.shares, 0)
  const totalValue = holdings.reduce((s, h) => {
    const q = quoteMap.get(h.symbol)
    return s + (q ? q.price * h.shares : h.buyPrice * h.shares)
  }, 0)
  const totalGain = totalValue - totalCost
  const totalGainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0

  const byType: Record<AssetType, number> = { stock: 0, etf: 0, crypto: 0 }
  for (const h of holdings) {
    const q = quoteMap.get(h.symbol)
    byType[h.assetType] += q ? q.price * h.shares : h.buyPrice * h.shares
  }
  const allocPct = (t: AssetType) =>
    totalValue > 0 ? ((byType[t] / totalValue) * 100).toFixed(1) : '0.0'

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-surface-2 border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint">Total value</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
            {fmt(totalValue)}
          </div>
        </div>
        <div className="rounded-xl bg-surface-2 border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint">Cost basis</div>
          <div className="mt-1 font-display text-2xl font-bold text-ink tabular-nums">
            {fmt(totalCost)}
          </div>
        </div>
        <div className="rounded-xl bg-surface-2 border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint">Total gain/loss</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${gainClass(totalGain)}`}>
            {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
          </div>
          <div className={`text-xs tabular-nums ${gainClass(totalGain)}`}>
            {fmtPct(totalGainPct)}
          </div>
        </div>
      </div>

      {totalValue > 0 && (
        <div className="rounded-xl bg-surface-2 border border-line p-4">
          <div className="text-xs uppercase tracking-wide text-ink-faint mb-2">Allocation</div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {byType.stock > 0 && (
              <div
                className="bg-brand h-full"
                style={{ width: `${(byType.stock / totalValue) * 100}%` }}
                title={`Stocks ${allocPct('stock')}%`}
              />
            )}
            {byType.etf > 0 && (
              <div
                className="bg-info h-full"
                style={{ width: `${(byType.etf / totalValue) * 100}%` }}
                title={`ETFs ${allocPct('etf')}%`}
              />
            )}
            {byType.crypto > 0 && (
              <div
                className="bg-warn h-full"
                style={{ width: `${(byType.crypto / totalValue) * 100}%` }}
                title={`Crypto ${allocPct('crypto')}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-xs text-ink-faint">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-brand" /> Stocks {allocPct('stock')}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-info" /> ETFs {allocPct('etf')}%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-warn" /> Crypto {allocPct('crypto')}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Recommendations ───────────────────────────────────────────────────────────

interface RecommendationsProps {
  holdings: Holding[]
  backendDown: boolean
  onAddFromRec: (r: { symbol: string; name: string; assetType: AssetType }) => void
}

function RecommendationsSection({ holdings, backendDown, onAddFromRec }: RecommendationsProps) {
  const [recs, setRecs] = useState<Recommendation[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (backendDown) return
    setLoading(true)
    getRecommendations(holdings.map((h) => ({ symbol: h.symbol, assetType: h.assetType })))
      .then((data) => setRecs(data.slice(0, 5)))
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : 'Could not load recommendations.'))
      .finally(() => setLoading(false))
  // Only re-fetch when backend availability changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendDown])

  if (backendDown) return <BackendNotice />
  if (loading)
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-ink-faint">
        <div className="w-4 h-4 rounded-full border-2 border-brand border-t-transparent animate-spin" />
        <span className="animate-pulse">Loading recommendations...</span>
      </div>
    )
  if (err) return <p className="text-sm text-bad-ink">{err}</p>
  if (!recs || recs.length === 0)
    return <p className="text-sm text-ink-faint">No recommendations available right now.</p>

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-faint">
        These are suggested ideas based on your holdings. They are educational suggestions only, not personalized financial advice.
      </p>
      {recs.map((r) => (
        <div key={r.symbol} className="bg-surface-2 rounded-2xl border border-line p-5">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display text-base font-bold text-ink">{r.symbol}</span>
              <span className="text-sm text-ink-faint">{r.name}</span>
              <AssetBadge type={r.assetType} />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-semibold text-ink tabular-nums">{fmt(r.price)}</div>
                <div className={`text-xs tabular-nums ${gainClass(r.changePct)}`}>
                  {fmtPct(r.changePct)} today
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  onAddFromRec({ symbol: r.symbol, name: r.name, assetType: r.assetType })
                }
                className="shrink-0 rounded-xl bg-brand-soft border border-brand-line text-brand-ink px-3 py-1.5 text-xs font-semibold hover:bg-brand hover:text-on-brand transition-colors"
              >
                Add to portfolio
              </button>
            </div>
          </div>
          {r.rationale && (
            <p className="mt-2 text-sm text-ink-mid">{r.rationale}</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Portfolio() {
  const { state, update } = useProfile()
  const profile = state!.profile
  const holdings: Holding[] = profile.investments ?? []

  const [quotes, setQuotes] = useState<Quote[]>([])
  const [backendDown, setBackendDown] = useState(false)
  const [quotesLoading, setQuotesLoading] = useState(false)

  const [prefill, setPrefill] = useState<{
    symbol: string
    name?: string
    assetType: AssetType
  } | null>(null)

  // Serialise symbol list for stable dep
  const symbolKey = holdings.map((h) => h.symbol).join(',')

  useEffect(() => {
    if (holdings.length === 0) return
    const symbols = [...new Set(holdings.map((h) => h.symbol))]
    setQuotesLoading(true)
    getQuotes(symbols)
      .then((q) => {
        setQuotes(q)
        setBackendDown(false)
      })
      .catch(() => setBackendDown(true))
      .finally(() => setQuotesLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey])

  const quoteMap = new Map(quotes.map((q) => [q.symbol, q]))

  const saveHoldings = (next: Holding[]) => {
    update({ ...profile, investments: next })
  }

  const handleAdd = (h: Holding) => {
    saveHoldings([...holdings, h])
  }

  const handleDelete = (id: string) => {
    saveHoldings(holdings.filter((h) => h.id !== id))
  }

  const handleAddFromRec = (r: { symbol: string; name: string; assetType: AssetType }) => {
    setPrefill(r)
    document.getElementById('add')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">INVEST</p>
        <h1 className="font-display text-2xl font-bold text-ink">Portfolio</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          Track your holdings with live prices, see how each position has moved since you bought it,
          and discover ideas to expand your portfolio.
        </p>
      </header>

      <PageNav
        sections={[
          { id: 'holdings', label: 'Holdings' },
          { id: 'add', label: 'Add holding' },
          { id: 'recommendations', label: 'Recommendations' },
        ]}
      />

      {/* Backend notice (holdings exist but backend unreachable) */}
      {backendDown && holdings.length > 0 && (
        <BackendNotice />
      )}

      {/* Holdings */}
      <section id="holdings" className="scroll-mt-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Holdings</h2>

        {holdings.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-line p-8 text-center">
            <div className="flex justify-center mb-3">
              <TrendUpIcon className="w-8 h-8 text-ink-faint" />
            </div>
            <p className="text-sm text-ink-faint">
              No holdings yet. Add your first position below.
            </p>
          </div>
        ) : (
          <>
            {quotesLoading && (
              <div className="flex items-center gap-2 text-xs text-ink-faint animate-pulse">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                Fetching live prices...
              </div>
            )}
            <PortfolioSummary holdings={holdings} quotes={quotes} />
            <div className="space-y-3">
              {holdings.map((h) => (
                <HoldingCard
                  key={h.id}
                  holding={h}
                  quote={quoteMap.get(h.symbol)}
                  backendDown={backendDown}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Add holding */}
      <section id="add" className="scroll-mt-6 bg-surface rounded-2xl border border-line p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Add holding</h2>
        <AddHoldingForm
          onAdd={handleAdd}
          backendDown={backendDown}
          prefill={prefill}
          onPrefillConsumed={() => setPrefill(null)}
        />
      </section>

      {/* Recommendations */}
      <section id="recommendations" className="scroll-mt-6 bg-surface rounded-2xl border border-line p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint">Recommendations</h2>
        <RecommendationsSection
          holdings={holdings}
          backendDown={backendDown}
          onAddFromRec={handleAddFromRec}
        />
      </section>

      {/* Disclaimer */}
      <p className="text-xs text-ink-faint text-center pb-2">
        Investing involves risk and past performance does not guarantee future results. delphi is an
        educational tool, not financial advice. Consult a licensed financial advisor for personalized
        guidance.
      </p>
    </div>
  )
}
