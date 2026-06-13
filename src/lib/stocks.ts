// Market data client. Calls hosted APIs directly from the browser, so there is
// no separate backend process to run.
//
// Hybrid setup (two free keys):
//   - Finnhub  (https://finnhub.io)      -> live stock/ETF quotes + symbol search.
//                                            Free tier ~60 req/min. Used for the
//                                            high-frequency traffic.
//   - Twelve Data (https://twelvedata.com) -> historical time series (trend charts)
//                                            and crypto quotes (Finnhub free has no
//                                            crypto quote). Free tier 8 req/min, so
//                                            it is only hit on demand.
//
// Put both keys in .env.local:
//   VITE_FINNHUB_API_KEY=...
//   VITE_TWELVEDATA_API_KEY=...
// Crypto symbols are stored yfinance style (BTC-USD); Twelve Data uses BTC/USD,
// so we translate at the boundary.

const FINNHUB_BASE = 'https://finnhub.io/api/v1'
const TD_BASE = 'https://api.twelvedata.com'
const FINNHUB_KEY = (import.meta.env.VITE_FINNHUB_API_KEY as string) || ''
const TD_KEY = (import.meta.env.VITE_TWELVEDATA_API_KEY as string) || ''

export interface Quote {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  previousClose: number
  currency: string
  assetType: 'stock' | 'etf' | 'crypto'
}

export interface HistoryPoint {
  date: string
  close: number
}

export interface SymbolResult {
  symbol: string
  name: string
  assetType: 'stock' | 'etf' | 'crypto'
}

export interface Recommendation {
  symbol: string
  name: string
  assetType: 'stock' | 'etf' | 'crypto'
  rationale: string
  price: number
  changePct: number
}

// ── helpers ──────────────────────────────────────────────────────────────────

function ensureFinnhub(): void {
  if (!FINNHUB_KEY) {
    throw new Error(
      'No Finnhub API key set. Add VITE_FINNHUB_API_KEY to your .env.local (free key at finnhub.io), then restart the dev server.',
    )
  }
}

function ensureTd(): void {
  if (!TD_KEY) {
    throw new Error(
      'No Twelve Data API key set. Add VITE_TWELVEDATA_API_KEY to your .env.local (free key at twelvedata.com), then restart the dev server.',
    )
  }
}

function num(v: unknown): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

const CRYPTO_RE = /^[A-Z0-9]+-USD$/i

function isCrypto(symbol: string): boolean {
  return CRYPTO_RE.test(symbol.trim())
}

/** App symbol (BTC-USD) -> Twelve Data symbol (BTC/USD). Non-crypto unchanged. */
function toTd(symbol: string): string {
  const s = symbol.trim().toUpperCase()
  return CRYPTO_RE.test(s) ? s.replace(/-USD$/i, '/USD') : s
}

function tdType(type: unknown, symbol: string): 'stock' | 'etf' | 'crypto' {
  const t = String(type ?? '').toLowerCase()
  if (t.includes('etf') || t.includes('fund')) return 'etf'
  if (t.includes('digital') || t.includes('crypto')) return 'crypto'
  if (symbol.includes('/') || CRYPTO_RE.test(symbol)) return 'crypto'
  return 'stock'
}

function finnhubType(type: unknown): 'stock' | 'etf' {
  const t = String(type ?? '').toUpperCase()
  if (t.includes('ETF') || t.includes('ETP') || t.includes('FUND')) return 'etf'
  return 'stock'
}

type Rec = Record<string, unknown>

// ── Finnhub (stock/ETF quotes + search) ───────────────────────────────────────

async function finnhubFetch(path: string, params: Record<string, string>): Promise<Rec> {
  ensureFinnhub()
  const usp = new URLSearchParams({ ...params, token: FINNHUB_KEY })
  let res: Response
  try {
    res = await fetch(`${FINNHUB_BASE}${path}?${usp.toString()}`)
  } catch {
    throw new Error('Could not reach the market data service. Check your internet connection.')
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Finnhub API key is missing or invalid. Check VITE_FINNHUB_API_KEY.')
  }
  if (res.status === 429) {
    throw new Error('Finnhub rate limit reached. Wait a minute and refresh.')
  }
  let data: Rec
  try {
    data = (await res.json()) as Rec
  } catch {
    throw new Error('The market data service returned an unreadable response.')
  }
  if (!res.ok) throw new Error(String(data?.error ?? 'Market data request failed.'))
  return data
}

async function finnhubQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase()
  const d = await finnhubFetch('/quote', { symbol: sym })
  const price = num(d.c)
  if (!price) throw new Error(`No price found for ${sym}.`)
  const prev = num(d.pc) || price
  return {
    symbol: sym,
    name: sym, // holdings carry their own name (from search); Finnhub /quote omits it
    price: round2(price),
    previousClose: round2(prev),
    change: round2(d.d !== undefined ? num(d.d) : price - prev),
    changePct: round2(d.dp !== undefined ? num(d.dp) : prev ? ((price - prev) / prev) * 100 : 0),
    currency: 'USD',
    assetType: 'stock',
  }
}

// ── Twelve Data (history + crypto quotes) ─────────────────────────────────────

async function tdFetch(path: string, params: Record<string, string>): Promise<Rec> {
  ensureTd()
  const usp = new URLSearchParams({ ...params, apikey: TD_KEY })
  let res: Response
  try {
    res = await fetch(`${TD_BASE}${path}?${usp.toString()}`)
  } catch {
    throw new Error('Could not reach the market data service. Check your internet connection.')
  }
  let data: Rec
  try {
    data = (await res.json()) as Rec
  } catch {
    throw new Error('The market data service returned an unreadable response.')
  }
  if (data && data.status === 'error') {
    const msg = String(data.message ?? 'Market data request failed.')
    if (/api key/i.test(msg)) throw new Error('Twelve Data API key is missing or invalid. Check VITE_TWELVEDATA_API_KEY.')
    if (/run out|limit|credits/i.test(msg)) throw new Error('Twelve Data rate limit reached. Wait a minute and try again.')
    throw new Error(msg)
  }
  if (!res.ok) throw new Error(String(data?.message ?? 'Market data request failed.'))
  return data
}

function parseTdQuote(entry: Rec, appSymbol: string): Quote {
  const close = num(entry.close)
  const prev = num(entry.previous_close) || close
  const change = entry.change !== undefined ? num(entry.change) : close - prev
  const changePct =
    entry.percent_change !== undefined ? num(entry.percent_change) : prev ? (change / prev) * 100 : 0
  return {
    symbol: appSymbol.toUpperCase(),
    name: String(entry.name ?? appSymbol.toUpperCase()),
    price: round2(close),
    previousClose: round2(prev),
    change: round2(change),
    changePct: round2(changePct),
    currency: String(entry.currency ?? 'USD'),
    assetType: tdType(entry.type, appSymbol),
  }
}

async function tdCryptoQuote(symbol: string): Promise<Quote> {
  const data = await tdFetch('/quote', { symbol: toTd(symbol) })
  if (!data.close) throw new Error(`No price found for ${symbol.toUpperCase()}.`)
  return parseTdQuote(data, symbol)
}

// ── public API (signatures unchanged so callers need no edits) ────────────────

export async function getQuote(symbol: string): Promise<Quote> {
  return isCrypto(symbol) ? tdCryptoQuote(symbol) : finnhubQuote(symbol)
}

export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return []
  const crypto: string[] = []
  const others: string[] = []
  for (const s of symbols) (isCrypto(s) ? crypto : others).push(s.toUpperCase())

  // Surface missing-key errors up front so the page shows its notice.
  if (others.length) ensureFinnhub()
  if (crypto.length) ensureTd()

  const out: Quote[] = []

  // Crypto: one batched Twelve Data call.
  if (crypto.length) {
    try {
      const data = await tdFetch('/quote', { symbol: crypto.map(toTd).join(',') })
      if (crypto.length === 1) {
        if (data.close) out.push(parseTdQuote(data, crypto[0]))
      } else {
        for (const app of crypto) {
          const entry = data[toTd(app)] as Rec | undefined
          if (entry && entry.status !== 'error' && entry.close) out.push(parseTdQuote(entry, app))
        }
      }
    } catch {
      // transient: leave crypto unpriced, page falls back to cost basis
    }
  }

  // Stocks/ETFs: Finnhub in parallel, tolerate individual symbol failures.
  if (others.length) {
    const settled = await Promise.allSettled(others.map((s) => finnhubQuote(s)))
    for (const r of settled) if (r.status === 'fulfilled') out.push(r.value)
  }

  return out
}

export async function getHistory(symbol: string, from: string): Promise<HistoryPoint[]> {
  // Twelve Data time series, for all asset types. Coarser interval for long spans.
  let interval = '1day'
  const start = new Date(from).getTime()
  if (Number.isFinite(start)) {
    const days = (Date.now() - start) / (1000 * 60 * 60 * 24)
    if (days > 365 * 5) interval = '1month'
    else if (days > 365 * 2) interval = '1week'
  }
  const data = await tdFetch('/time_series', {
    symbol: toTd(symbol),
    interval,
    start_date: from,
    outputsize: '5000',
    order: 'ASC',
  })
  const values = Array.isArray(data.values) ? (data.values as Rec[]) : []
  const points = values
    .map((v) => ({ date: String(v.datetime ?? '').slice(0, 10), close: num(v.close) }))
    .filter((p) => p.date && Number.isFinite(p.close) && p.close > 0)
  if (points.length === 0) throw new Error(`No history found for ${symbol.toUpperCase()}.`)
  return points
}

// Finnhub search returns crypto-related stocks/ETFs but never the crypto pairs
// themselves, so we match common coins locally and surface them as BTC-USD style
// symbols (which quote + chart via Twelve Data). No extra API call.
const CRYPTO_CATALOG: SymbolResult[] = [
  { symbol: 'BTC-USD', name: 'Bitcoin', assetType: 'crypto' },
  { symbol: 'ETH-USD', name: 'Ethereum', assetType: 'crypto' },
  { symbol: 'SOL-USD', name: 'Solana', assetType: 'crypto' },
  { symbol: 'XRP-USD', name: 'XRP', assetType: 'crypto' },
  { symbol: 'ADA-USD', name: 'Cardano', assetType: 'crypto' },
  { symbol: 'DOGE-USD', name: 'Dogecoin', assetType: 'crypto' },
  { symbol: 'AVAX-USD', name: 'Avalanche', assetType: 'crypto' },
  { symbol: 'LINK-USD', name: 'Chainlink', assetType: 'crypto' },
  { symbol: 'DOT-USD', name: 'Polkadot', assetType: 'crypto' },
  { symbol: 'MATIC-USD', name: 'Polygon', assetType: 'crypto' },
  { symbol: 'LTC-USD', name: 'Litecoin', assetType: 'crypto' },
  { symbol: 'BCH-USD', name: 'Bitcoin Cash', assetType: 'crypto' },
]

export async function searchSymbols(q: string): Promise<SymbolResult[]> {
  const ql = q.trim().toLowerCase()
  const cryptoMatches =
    ql.length >= 2
      ? CRYPTO_CATALOG.filter(
          (c) => c.name.toLowerCase().includes(ql) || c.symbol.toLowerCase().includes(ql),
        )
      : []

  const stockResults: SymbolResult[] = []
  try {
    const data = await finnhubFetch('/search', { q })
    const rows = Array.isArray(data.result) ? (data.result as Rec[]) : []
    const seen = new Set<string>()
    for (const row of rows) {
      const sym = String(row.symbol ?? '').toUpperCase()
      // Skip foreign/compound tickers (with a dot) to keep results clean.
      if (!sym || sym.includes('.') || seen.has(sym)) continue
      seen.add(sym)
      stockResults.push({
        symbol: sym,
        name: String(row.description ?? sym),
        assetType: finnhubType(row.type),
      })
      if (stockResults.length >= 8) break
    }
  } catch (e) {
    // If at least some crypto matched locally, still return those; otherwise surface the error.
    if (cryptoMatches.length === 0) throw e
  }

  // Crypto matches first, then stocks/ETFs, deduped, capped at 8.
  const out: SymbolResult[] = []
  const seen = new Set<string>()
  for (const r of [...cryptoMatches, ...stockResults]) {
    if (seen.has(r.symbol)) continue
    seen.add(r.symbol)
    out.push(r)
    if (out.length >= 8) break
  }
  return out
}

// ── recommendations (rules ported from the former Python backend) ─────────────

interface Candidate {
  symbol: string
  name: string
  assetType: 'stock' | 'etf' | 'crypto'
  rationale: string
}

const BROAD_MARKET = new Set(['VOO', 'VTI', 'VXUS', 'QQQ'])
const BOND_SYMBOLS = new Set(['BND'])
const INTL_SYMBOLS = new Set(['VXUS'])
const CRYPTO_SYMBOLS = new Set(['BTC-USD', 'ETH-USD'])

const C: Record<string, Candidate> = {
  VOO: { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', assetType: 'etf', rationale: 'A low-cost S&P 500 index fund is the simplest way to diversify a starter portfolio.' },
  VTI: { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', assetType: 'etf', rationale: 'One fund holding the entire US stock market, a solid core for any portfolio.' },
  VXUS: { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', assetType: 'etf', rationale: 'About 40 percent of global market value is outside the US. VXUS gives you that exposure cheaply.' },
  BND: { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', assetType: 'etf', rationale: 'Adds stability. Bonds move differently from stocks and can cushion big market swings.' },
  SCHD: { symbol: 'SCHD', name: 'Schwab US Dividend Equity ETF', assetType: 'etf', rationale: 'Dividend-focused ETF that combines income with quality US stocks.' },
  QQQ: { symbol: 'QQQ', name: 'Invesco QQQ Trust', assetType: 'etf', rationale: 'Tracks the Nasdaq-100 for concentrated exposure to large-cap tech and growth.' },
  'BTC-USD': { symbol: 'BTC-USD', name: 'Bitcoin', assetType: 'crypto', rationale: 'A small crypto slice (5 percent or less) adds high-risk, high-reward upside. Only invest what you can afford to lose.' },
  'ETH-USD': { symbol: 'ETH-USD', name: 'Ethereum', assetType: 'crypto', rationale: 'The second-largest crypto. Keep any crypto a small part of the portfolio.' },
}

function pickRecommendations(holdings: { symbol: string; assetType: string }[]): Candidate[] {
  const held = new Set(holdings.map((h) => h.symbol.toUpperCase()))
  const has = (set: Set<string>) => [...held].some((s) => set.has(s))
  const hasStocks = holdings.some((h) => h.assetType === 'stock')

  const picks: Candidate[] = []
  const add = (key: string) => {
    if (picks.length < 5 && !held.has(key) && !picks.some((p) => p.symbol === key)) picks.push(C[key])
  }

  if (held.size === 0) {
    return [C.VOO, C.SCHD, C['BTC-USD']]
  }
  if (!has(BROAD_MARKET)) add('VOO')
  if (hasStocks && !has(BOND_SYMBOLS)) add('BND')
  if (!has(INTL_SYMBOLS)) add('VXUS')
  if (!has(CRYPTO_SYMBOLS) && held.size >= 2) add('BTC-USD')
  add('SCHD')
  add('QQQ')
  return picks.slice(0, 5)
}

export async function getRecommendations(
  holdings: { symbol: string; assetType: string }[],
): Promise<Recommendation[]> {
  const picks = pickRecommendations(holdings)
  if (picks.length === 0) return []

  // Surface missing-key errors so the section shows a clear message.
  if (picks.some((p) => !isCrypto(p.symbol))) ensureFinnhub()
  if (picks.some((p) => isCrypto(p.symbol))) ensureTd()

  let quotes: Quote[] = []
  try {
    quotes = await getQuotes(picks.map((p) => p.symbol))
  } catch {
    quotes = []
  }
  const bySymbol = new Map(quotes.map((q) => [q.symbol.toUpperCase(), q]))

  return picks.map((p) => {
    const q = bySymbol.get(p.symbol.toUpperCase())
    return {
      symbol: p.symbol,
      name: p.name,
      assetType: p.assetType,
      rationale: p.rationale,
      price: q?.price ?? 0,
      changePct: q?.changePct ?? 0,
    }
  })
}
