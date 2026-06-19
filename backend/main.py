"""
delphi -- market data backend
FastAPI + yfinance, designed to run locally on port 8000.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timedelta
from typing import Any

import requests
import yfinance as yf
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_CHAT_URL = "https://integrate.api.nvidia.com/v1/chat/completions"

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

_raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
_vercel_origin = os.getenv("VERCEL_ORIGIN", "")

allow_origins: list[str] = [o.strip() for o in _raw_origins.split(",") if o.strip()]
if _vercel_origin and _vercel_origin not in allow_origins:
    allow_origins.append(_vercel_origin)

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(title="delphi market data API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-process TTL quote cache (60 s)
# ---------------------------------------------------------------------------

_CACHE_TTL = 60  # seconds
_quote_cache: dict[str, tuple[float, Any]] = {}  # symbol -> (ts, data)


def _cache_get(symbol: str) -> Any | None:
    entry = _quote_cache.get(symbol)
    if entry and (time.monotonic() - entry[0]) < _CACHE_TTL:
        return entry[1]
    return None


def _cache_set(symbol: str, data: Any) -> None:
    _quote_cache[symbol] = (time.monotonic(), data)


# ---------------------------------------------------------------------------
# Shared quote-building logic
# ---------------------------------------------------------------------------


class Quote(BaseModel):
    symbol: str
    name: str
    assetType: str  # 'stock' | 'etf' | 'crypto'
    price: float
    previousClose: float
    change: float
    changePct: float
    currency: str


def _build_quote(symbol: str) -> Quote:
    """Fetch and return a Quote for *symbol*. Raises HTTPException on failure."""
    cached = _cache_get(symbol)
    if cached is not None:
        return cached

    ticker = yf.Ticker(symbol)

    # --- price & previous close via fast_info first ---
    price: float | None = None
    previous_close: float | None = None
    currency: str = "USD"
    try:
        fi = ticker.fast_info
        price = getattr(fi, "last_price", None)
        previous_close = getattr(fi, "previous_close", None)
        currency = getattr(fi, "currency", None) or "USD"
    except Exception:
        pass

    # --- fall back to .info ---
    info: dict = {}
    if price is None or previous_close is None:
        try:
            info = ticker.info or {}
        except Exception:
            info = {}
        if price is None:
            price = info.get("currentPrice") or info.get("regularMarketPrice")
        if previous_close is None:
            previous_close = info.get("previousClose") or info.get(
                "regularMarketPreviousClose"
            )
        if currency == "USD":
            currency = info.get("currency", "USD") or "USD"

    if not price:
        raise HTTPException(status_code=404, detail=f"Symbol not found: {symbol}")

    price = round(float(price), 2)
    previous_close = round(float(previous_close), 2) if previous_close else price

    change = round(price - previous_close, 2)
    change_pct = round((change / previous_close) * 100, 2) if previous_close else 0.0

    # --- display name (fetch info if not already loaded) ---
    if not info:
        try:
            info = ticker.info or {}
        except Exception:
            info = {}
    name: str = info.get("shortName") or info.get("longName") or symbol

    # --- asset type ---
    if symbol.upper().endswith("-USD"):
        asset_type = "crypto"
    else:
        qt = (info.get("quoteType") or "").upper()
        asset_type = "etf" if qt == "ETF" else "stock"

    result = Quote(
        symbol=symbol.upper(),
        name=name,
        assetType=asset_type,
        price=price,
        previousClose=previous_close,
        change=change,
        changePct=change_pct,
        currency=currency,
    )
    _cache_set(symbol, result)
    return result


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/")
def root() -> dict:
    """Friendly index so the bare URL does not look broken. The app uses /api/*."""
    return {
        "service": "delphi market data API",
        "status": "ok",
        "endpoints": [
            "/api/health",
            "/api/quote?symbol=AAPL",
            "/api/quotes (POST {symbols:[...]})",
            "/api/history?symbol=AAPL&from_date=YYYY-MM-DD",
            "/api/search?q=apple",
            "/api/recommendations (POST {holdings:[...]})",
            "/api/coach (POST {model, messages:[...]})",
        ],
    }


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/quote", response_model=Quote)
def get_quote(symbol: str) -> Quote:
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")
    try:
        return _build_quote(symbol.upper())
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc


# ---------------------------------------------------------------------------
# POST /api/quotes -- batch
# ---------------------------------------------------------------------------


class QuotesRequest(BaseModel):
    symbols: list[str]


@app.post("/api/quotes", response_model=list[Quote])
def get_quotes(body: QuotesRequest) -> list[Quote]:
    results: list[Quote] = []
    for sym in body.symbols:
        try:
            results.append(_build_quote(sym.upper()))
        except Exception:
            # Skip symbols that fail rather than aborting the batch
            pass
    return results


# ---------------------------------------------------------------------------
# GET /api/history
# ---------------------------------------------------------------------------


class HistoryPoint(BaseModel):
    date: str
    close: float


class HistoryResponse(BaseModel):
    symbol: str
    points: list[HistoryPoint]


@app.get("/api/history", response_model=HistoryResponse)
def get_history(symbol: str, from_date: str | None = None) -> HistoryResponse:
    """
    Query params: symbol, from_date (YYYY-MM-DD).
    Note: callers should use ?from_date=YYYY-MM-DD because 'from' is a
    reserved Python keyword and cannot be a FastAPI param name directly.
    """
    if not symbol:
        raise HTTPException(status_code=400, detail="symbol is required")

    if from_date is None:
        from_date = (datetime.utcnow() - timedelta(days=365)).strftime("%Y-%m-%d")

    try:
        start_dt = datetime.strptime(from_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400, detail="from_date must be YYYY-MM-DD"
        )

    span_days = (datetime.utcnow() - start_dt).days
    if span_days > 365 * 5:
        interval = "1mo"
    elif span_days > 365 * 2:
        interval = "1wk"
    else:
        interval = "1d"

    try:
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(start=from_date, interval=interval)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Upstream error: {exc}") from exc

    if hist is None or hist.empty:
        raise HTTPException(
            status_code=404, detail=f"No history found for symbol: {symbol}"
        )

    points: list[HistoryPoint] = []
    for ts, row in hist.iterrows():
        try:
            close_val = float(row["Close"])
            date_str = (
                ts.strftime("%Y-%m-%d") if hasattr(ts, "strftime") else str(ts)[:10]
            )
            points.append(HistoryPoint(date=date_str, close=round(close_val, 2)))
        except Exception:
            continue

    if not points:
        raise HTTPException(
            status_code=404, detail=f"No history found for symbol: {symbol}"
        )

    return HistoryResponse(symbol=symbol.upper(), points=points)


# ---------------------------------------------------------------------------
# GET /api/search
# ---------------------------------------------------------------------------


class SearchResult(BaseModel):
    symbol: str
    name: str
    assetType: str


def _qt_to_asset_type(qt: str) -> str:
    qt = (qt or "").upper()
    if qt == "ETF":
        return "etf"
    if qt in ("CRYPTOCURRENCY", "CRYPTO"):
        return "crypto"
    return "stock"


@app.get("/api/search", response_model=list[SearchResult])
def search(q: str) -> list[SearchResult]:
    if not q:
        raise HTTPException(status_code=400, detail="q is required")

    results: list[SearchResult] = []
    seen: set[str] = set()

    # Try yfinance Search API (available in yfinance >= 0.2.37)
    try:
        search_obj = yf.Search(q, max_results=10)
        quotes_list = search_obj.quotes
        for item in quotes_list:
            sym = (item.get("symbol") or "").upper()
            if not sym or sym in seen:
                continue
            seen.add(sym)
            name = item.get("shortname") or item.get("longname") or sym
            asset_type = _qt_to_asset_type(item.get("quoteType", ""))
            results.append(SearchResult(symbol=sym, name=name, assetType=asset_type))
            if len(results) >= 8:
                break
    except Exception:
        # Fall back to treating q as a ticker symbol
        pass

    # Fallback or supplement: validate q as a direct ticker
    if not results:
        sym = q.upper()
        try:
            quote = _build_quote(sym)
            results.append(
                SearchResult(
                    symbol=quote.symbol,
                    name=quote.name,
                    assetType=quote.assetType,
                )
            )
        except Exception:
            pass

    return results


# ---------------------------------------------------------------------------
# POST /api/recommendations
# ---------------------------------------------------------------------------

CANDIDATES = [
    {"symbol": "VOO",     "assetType": "etf",    "name": "Vanguard S&P 500 ETF"},
    {"symbol": "VTI",     "assetType": "etf",    "name": "Vanguard Total Stock Market ETF"},
    {"symbol": "VXUS",    "assetType": "etf",    "name": "Vanguard Total International Stock ETF"},
    {"symbol": "BND",     "assetType": "etf",    "name": "Vanguard Total Bond Market ETF"},
    {"symbol": "SCHD",    "assetType": "etf",    "name": "Schwab U.S. Dividend Equity ETF"},
    {"symbol": "QQQ",     "assetType": "etf",    "name": "Invesco QQQ Trust (Nasdaq-100)"},
    {"symbol": "BTC-USD", "assetType": "crypto", "name": "Bitcoin"},
    {"symbol": "ETH-USD", "assetType": "crypto", "name": "Ethereum"},
]

BROAD_MARKET = {"VOO", "VTI", "VXUS", "QQQ"}
BOND_SYMBOLS = {"BND"}
INTL_SYMBOLS = {"VXUS"}
CRYPTO_SYMBOLS = {"BTC-USD", "ETH-USD"}


class HoldingIn(BaseModel):
    symbol: str
    assetType: str


class Recommendation(BaseModel):
    symbol: str
    name: str
    assetType: str
    rationale: str
    price: float
    changePct: float


class RecommendationsRequest(BaseModel):
    holdings: list[HoldingIn]


def _enrich(sym: str, name: str, asset_type: str, rationale: str) -> Recommendation:
    try:
        q = _build_quote(sym)
        price = q.price
        change_pct = q.changePct
    except Exception:
        price = 0.0
        change_pct = 0.0
    return Recommendation(
        symbol=sym,
        name=name,
        assetType=asset_type,
        rationale=rationale,
        price=price,
        changePct=change_pct,
    )


@app.post("/api/recommendations", response_model=list[Recommendation])
def get_recommendations(body: RecommendationsRequest) -> list[Recommendation]:
    held = {h.symbol.upper() for h in body.holdings}
    has_broad = bool(held & BROAD_MARKET)
    has_bonds = bool(held & BOND_SYMBOLS)
    has_intl = bool(held & INTL_SYMBOLS)
    has_crypto = bool(held & CRYPTO_SYMBOLS)
    has_stocks = any(h.assetType == "stock" for h in body.holdings)

    recs: list[Recommendation] = []

    # Empty portfolio: beginner set
    if not held:
        recs.append(_enrich(
            "VOO", "Vanguard S&P 500 ETF", "etf",
            "A great starting point: one fund gives you a slice of America's 500 largest companies at very low cost.",
        ))
        recs.append(_enrich(
            "SCHD", "Schwab U.S. Dividend Equity ETF", "etf",
            "Pays a growing dividend, so you get income as well as growth. A nice complement to VOO.",
        ))
        recs.append(_enrich(
            "BTC-USD", "Bitcoin", "crypto",
            "A small crypto position (5% or less) adds a high-risk, high-reward component. Only invest what you can afford to lose.",
        ))
        return recs

    # Rule 1: No broad-market ETF
    if not has_broad and "VOO" not in held and len(recs) < 5:
        recs.append(_enrich(
            "VOO", "Vanguard S&P 500 ETF", "etf",
            "A low-cost S&P 500 index fund is the simplest way to diversify a starter portfolio.",
        ))

    # Rule 2: Has individual stocks but no bonds
    if has_stocks and not has_bonds and "BND" not in held and len(recs) < 5:
        recs.append(_enrich(
            "BND", "Vanguard Total Bond Market ETF", "etf",
            "Adds stability, bonds move differently from stocks and can cushion big market swings.",
        ))

    # Rule 3: No international exposure
    if not has_intl and "VXUS" not in held and len(recs) < 5:
        recs.append(_enrich(
            "VXUS", "Vanguard Total International Stock ETF", "etf",
            "About 40% of global market cap is outside the US. VXUS gives you that exposure cheaply.",
        ))

    # Rule 4: No crypto and owns at least 2 assets
    if not has_crypto and len(held) >= 2 and "BTC-USD" not in held and len(recs) < 5:
        recs.append(_enrich(
            "BTC-USD", "Bitcoin", "crypto",
            "A small crypto slice (5% or less) can boost long-term returns. Keep it a minor part of the portfolio.",
        ))

    # Fill remaining slots from SCHD / QQQ
    extras = [
        (
            "SCHD", "Schwab U.S. Dividend Equity ETF", "etf",
            "Dividend-focused ETF that combines income with quality US stocks.",
        ),
        (
            "QQQ", "Invesco QQQ Trust", "etf",
            "Tracks the Nasdaq-100 and gives you concentrated exposure to large-cap tech and growth companies.",
        ),
    ]
    for sym, name, at, rationale in extras:
        if len(recs) >= 5:
            break
        if sym not in held:
            recs.append(_enrich(sym, name, at, rationale))

    return recs[:5]


# ---------------------------------------------------------------------------
# POST /api/coach -- proxies chat completions to NVIDIA NIM
#
# The frontend builds the system prompt (delphi's role + the student's
# serialized profile) and message history; this endpoint only attaches the
# secret API key and forwards the request, so NVIDIA_API_KEY never reaches
# the browser. NVIDIA's API does not support direct browser calls (no CORS
# on the response), which is the whole reason this proxy exists.
# ---------------------------------------------------------------------------


class ChatTurn(BaseModel):
    role: str
    content: str


class CoachRequest(BaseModel):
    model: str
    messages: list[ChatTurn]
    temperature: float = 0.5
    top_p: float = 0.9
    max_tokens: int = 700


@app.post("/api/coach")
def coach_chat(body: CoachRequest) -> dict:
    if not NVIDIA_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="NVIDIA_API_KEY is not set on the backend. Add it to backend/.env and restart uvicorn.",
        )
    try:
        resp = requests.post(
            NVIDIA_CHAT_URL,
            headers={
                "Authorization": f"Bearer {NVIDIA_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": body.model,
                "messages": [m.model_dump() for m in body.messages],
                "temperature": body.temperature,
                "top_p": body.top_p,
                "max_tokens": body.max_tokens,
                "stream": False,
            },
            timeout=60,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Could not reach NVIDIA NIM: {exc}") from exc

    if resp.status_code >= 400:
        raise HTTPException(status_code=resp.status_code, detail=f"NVIDIA NIM error: {resp.text[:500]}")

    return resp.json()
