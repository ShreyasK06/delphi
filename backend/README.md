# delphi backend

Local Python FastAPI service that provides market data to the delphi frontend via yfinance.

## Running locally

```bash
# 1. Create and activate a virtual environment
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt

# 3. Copy the env template and edit if needed
cp .env.example .env

# 4. Start the dev server (auto-reloads on file changes)
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### Environment variables

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated list of allowed CORS origins |
| `VERCEL_ORIGIN` | _(empty)_ | Your Vercel deployment URL, added to CORS automatically |
| `NVIDIA_API_KEY` | _(empty)_ | NVIDIA NIM key for `/api/coach` (https://build.nvidia.com). Kept server-side because NVIDIA's API doesn't support direct browser calls. |

## Frontend connection

The frontend reads `VITE_API_URL` (default: `http://localhost:8000`).
Set it in your root `.env`:

```
VITE_API_URL=http://localhost:8000
```

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/quote?symbol=AAPL` | Single quote |
| POST | `/api/quotes` | Batch quotes `{ "symbols": ["AAPL", "VOO"] }` |
| GET | `/api/history?symbol=AAPL&from_date=2023-01-01` | Price history |
| GET | `/api/search?q=apple` | Symbol search |
| POST | `/api/recommendations` | Diversification suggestions |
| POST | `/api/coach` | Proxies chat completions to NVIDIA NIM (`{ model, messages: [...] }`); requires `NVIDIA_API_KEY` |

## Deploying to Vercel

`backend/api/index.py` re-exports the FastAPI app from `main.py` so Vercel's
zero-config Python runtime can find it; `backend/vercel.json` routes every
path to that function. Nothing else needs to change.

1. In the Vercel dashboard, **Add New Project** and import this repo.
2. Set **Root Directory** to `backend`. Leave Framework Preset as "Other" —
   no build command is needed, Vercel installs `requirements.txt` automatically.
3. Add environment variables (Project Settings → Environment Variables):
   - `NVIDIA_API_KEY` = your NVIDIA NIM key
   - `CORS_ORIGINS` = your GitHub Pages origin, e.g.
     `https://<your-username>.github.io` (no trailing path — CORS only checks
     scheme + host + port, so the `/delphi/` subpath doesn't matter)
4. Deploy. The API will be live at `https://<project-name>.vercel.app`.
5. Set `VITE_API_URL` (in the frontend's GitHub Actions secrets, see the root
   README) to that URL and redeploy the frontend.

Size note: `yfinance` pulls in pandas/numpy, which can push close to Vercel's
function size limit. If a deploy fails on size, the Render/Railway path below
is the fallback — no code changes needed, just point `VITE_API_URL` there instead.

## Deploying to Render or Railway

Both platforms can run the backend from the `backend/` folder directly.

### Render

1. Create a new **Web Service** and point it at your repo.
2. Set **Root Directory** to `backend`.
3. Set **Start Command** to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Add environment variables:
   - `CORS_ORIGINS` = your Vercel domain, e.g. `https://delphi-app.vercel.app`
   - `NVIDIA_API_KEY` = your NVIDIA NIM key, if using the coach chat
5. In your Vercel project, add:
   - `VITE_API_URL` = the Render service URL, e.g. `https://delphi-api.onrender.com`

### Railway

1. Create a new project and connect your repo.
2. Set the **Root Directory** to `backend` in service settings.
3. Set the start command to:
   ```
   uvicorn main:app --host 0.0.0.0 --port $PORT
   ```
4. Set the same `CORS_ORIGINS` and `VITE_API_URL` env vars as above.

## Notes

- Quotes are cached in-process for 60 seconds to reduce Yahoo Finance rate-limit risk.
- The `from_date` query param uses format `YYYY-MM-DD`. History interval is chosen
  automatically: daily for up to 2 years, weekly up to 5 years, monthly beyond that.
- `POST /api/recommendations` is rules-based diversification. No user data is stored.
