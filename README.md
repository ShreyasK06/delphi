<p align="center">
  <img src="public/logo-full.png" alt="delphi." width="420" />
</p>

<p align="center">
  <em>The lecture your tuition didn't cover.</em>
</p>

<p align="center">
  <a href="https://github.com/ShreyasK06/personal-finance-coach/actions/workflows/deploy-pages.yml"><img src="https://github.com/ShreyasK06/personal-finance-coach/actions/workflows/deploy-pages.yml/badge.svg" alt="Deploy status" /></a>
  <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-6.0-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ecf8e?logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
</p>

---

**delphi** is a budgeting and financial-literacy web app built for college students: no bank
logins, no jargon, just a two-minute setup that turns a student's own numbers into a plan they
can actually follow. A built-in AI coach answers questions grounded in that plan, not generic
"skip the latte" advice.

**[Live demo →](https://ShreyasK06.github.io/personal-finance-coach/)**

## Features

| Module | What it does |
|---|---|
| **Financial Health Score** | A single 0–100 score computed from income, spending, debt, and savings, with the levers that move it. |
| **Budget Builder** | Category-based budgeting with starter templates for common student income situations. |
| **Debt Payoff Planner** | Avalanche vs. snowball payoff schedules with payoff-date projections. |
| **Savings Goals** | Target-based goals with pace tracking ("on track" / "behind"). |
| **Investing 101** | Beginner investing education plus live portfolio tracking via real market data. |
| **Extra Cash Advisor** | Turns one-off windfalls (refunds, gifts, side-gig income) into a concrete allocation plan. |
| **Student Discounts** | A curated catalog of student discounts and perks. |
| **Credit Card Picker** | Compares owned and candidate cards against the user's actual spending pattern. |
| **Coach Chat** | An AI chat coach with full context on the user's profile, budget, and goals. |
| **Learn** | Short-form financial literacy lessons. |

## Tech stack

**Frontend** — React 19 + TypeScript, built with Vite and styled with Tailwind CSS v4 using a
custom semantic design-token system (see [STYLEGUIDE.md](STYLEGUIDE.md)). Routing is
client-side via React Router; state is split between Supabase (auth + persisted profile data)
and local component state.

**Backend** — A small FastAPI service (`backend/`) that:
- proxies chat completions to NVIDIA NIM (Nemotron) for the coach, keeping the API key
  server-side since NVIDIA's API rejects direct browser calls, and
- serves market data (quotes, history, symbol search) via `yfinance` for the Portfolio page.

**Data & auth** — Supabase (Postgres + Auth) stores accounts and profile data. Live market
quotes for the Investing page are fetched client-side from Finnhub and Twelve Data, so no
backend round-trip is needed for that part of the app.

**Deployment** — Frontend on GitHub Pages via GitHub Actions
(`.github/workflows/deploy-pages.yml`); backend on Vercel (with Render/Railway documented as
fallbacks in [backend/README.md](backend/README.md)).

## Getting started

### Prerequisites
- Node.js 20+
- Python 3.11+ (only needed if you're running the backend locally)
- A free [Supabase](https://supabase.com) project

### 1. Clone and install
```bash
git clone https://github.com/ShreyasK06/personal-finance-coach.git
cd personal-finance-coach
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in `.env.local` with your own keys:

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL (Project Settings → API) |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_FINNHUB_API_KEY` | Optional | Live quotes + symbol search on the Portfolio page ([finnhub.io](https://finnhub.io), free tier) |
| `VITE_TWELVEDATA_API_KEY` | Optional | Price-history charts + crypto quotes ([twelvedata.com](https://twelvedata.com), free tier) |
| `VITE_API_URL` | Optional | URL of a running backend (defaults to `http://localhost:8000`); without one, the coach chat falls back to a rule-based offline mode |

### 3. Set up the database
Run [`supabase/schema.sql`](supabase/schema.sql) against your Supabase project (SQL Editor in
the Supabase dashboard is the quickest way).

### 4. Run the frontend
```bash
npm run dev
```
The app is now at `http://localhost:5173`.

### 5. (Optional) Run the backend
For live coach chat and portfolio quotes, see [backend/README.md](backend/README.md) for the
full setup — short version:
```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # .venv\Scripts\Activate.ps1 on Windows
pip install -r requirements.txt
cp .env.example .env   # add your NVIDIA_API_KEY
uvicorn main:app --reload --port 8000
```

## Available scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server with hot reload |
| `npm run build` | Type-check (`tsc -b`) and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

## Project structure

```
src/
├── pages/          # One component per route (Dashboard, Budget, Coach, ...)
├── components/      # Shared UI (Layout/sidebar, CoachWidget, icons, ...)
├── hooks/           # useAuth, useProfile, useTheme
├── lib/              # Domain logic — budget math, debt payoff, score, market data, ...
│   └── coach/         # CoachAdapter interface + mock and Nemotron implementations
└── index.css         # Design tokens (light-dark() color system)

backend/
├── main.py           # FastAPI app: /api/coach, /api/quote, /api/history, /api/recommendations
└── api/index.py       # Vercel serverless entrypoint

supabase/
└── schema.sql         # Postgres schema for accounts + profile data
```

## Design system

All UI work follows [STYLEGUIDE.md](STYLEGUIDE.md): a "money greens" semantic color palette
with automatic dark mode via CSS `light-dark()`, Space Grotesk for headings, Inter for body
text, and a deliberately minimal use of emoji and motion outside the landing page.

## Deployment

The frontend deploys automatically to GitHub Pages on every push to `main`. The backend is
deployed separately on Vercel (or Render/Railway). Full step-by-step instructions, including
how to wire `CORS_ORIGINS` and `VITE_API_URL` together, live in
[backend/README.md](backend/README.md#deploying-to-vercel).

## Disclaimer

delphi is an educational tool, not a licensed financial advisor. It doesn't connect to bank
accounts and doesn't execute trades or transfers — it's a planning and literacy tool only.
