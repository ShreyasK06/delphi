# personal-finance-coach

delphi — a budgeting and financial-literacy app for college students.
React + Vite frontend, Supabase for auth/data, FastAPI backend for market
data and the coach chat.

## Deployment: GitHub Pages (frontend) + Vercel (backend)

The config files are already in place (`.github/workflows/deploy-pages.yml`,
`vite.config.ts`'s `base`, `backend/vercel.json`). These steps need to happen
in the GitHub and Vercel web dashboards, since they require your login:

**1. Deploy the backend to Vercel first** (so you have its URL for step 3).
See [backend/README.md](backend/README.md#deploying-to-vercel) for the
detailed steps. You'll end up with a URL like `https://<project>.vercel.app`.

**2. Enable GitHub Pages for this repo:**
Settings → Pages → Build and deployment → Source → **GitHub Actions**.

**3. Add these as repo secrets** (Settings → Secrets and variables → Actions
→ New repository secret). Values come from your local `.env.local`, except
`VITE_API_URL` which is the Vercel URL from step 1:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_FINNHUB_API_KEY`
- `VITE_TWELVEDATA_API_KEY`
- `VITE_API_URL`

**4. Push to `main`** (or run the workflow manually from the Actions tab).
The `deploy-pages.yml` workflow builds and publishes to
`https://<your-username>.github.io/personal-finance-coach/`.

**5. Back in the Vercel project**, set `CORS_ORIGINS` to your GitHub Pages
origin (`https://<your-username>.github.io`, no path) so the backend accepts
requests from the deployed frontend, and redeploy the Vercel project.

If `VITE_API_URL` ever changes (e.g. you move the backend to Render),
re-running the Pages workflow is all that's needed on the frontend side.
