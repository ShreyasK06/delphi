# delphi · money, decoded for college

A client-side React app implementing the FinCoach spec (branded **delphi**): an animated landing
page with login/signup, onboarding intake, a 0–100 Financial Health Score, seven money tools
grounded in the user's actual numbers, and a popup coach chat. All data — including the demo
auth accounts — lives in `localStorage`; no backend.

## Run it

```sh
npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build to dist/
```

> Node.js was installed for this project at `~/.local/node`. If `npm` isn't found, add it to
> your PATH: `export PATH="$HOME/.local/node/bin:$PATH"` (add that line to `~/.zshrc` to make
> it permanent).

## What's inside

| Area | Where |
|---|---|
| Financial Health Score rubric (6 categories) | `src/lib/score.ts` |
| 50/30/20 college budget framework | `src/lib/budget.ts` |
| Avalanche vs. snowball debt amortization | `src/lib/debt.ts` |
| Savings goal math + feasibility flags | `src/lib/goals.ts` |
| Emergency fund target (1 month of essentials, $500 micro-goal from zero) | `src/lib/emergency.ts` |
| Windfall decision tree | `src/lib/windfall.ts` |
| Profile persistence + score history | `src/lib/storage.ts` |
| Coach chat (rule-based mock) | `src/lib/coach/mockCoach.ts` |
| Landing page + auth panel | `src/pages/Landing.tsx`, `src/hooks/useAuth.tsx` |
| Popup coach widget | `src/components/CoachWidget.tsx` |

## Plugging in the real Claude API later

The chat is built against the `CoachAdapter` interface in `src/lib/coach/adapter.ts`. To make
the coach truly conversational, implement that interface with a small server-side proxy that
calls the Claude API (never call it directly from the browser — that exposes your API key),
inject the FinCoach system prompt plus the serialized profile, and swap it in on
`src/pages/Coach.tsx`. Nothing else needs to change.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · React Router 7
