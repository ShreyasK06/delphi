# delphi, project notes for Claude

- **All UI work must follow [STYLEGUIDE.md](STYLEGUIDE.md).** Read it before styling anything.
  Key points: money-greens token palette (no hardcoded Tailwind colors — use the semantic
  tokens in `src/index.css`), Space Grotesk headings + Inter body, very minimal emoji
  (chat/milestones only), subtle motion in the app (looping animation allowed on the landing
  page only), no em dashes in user-facing copy, crisp white cards + the one glass sidebar,
  single-column dashboard feeds, dark mode via `light-dark()` tokens with a system/light/dark
  toggle in `src/hooks/useTheme.tsx`. The app is named **delphi** (lowercase, wordmark `delphi.`).
- Node.js is installed user-locally at `~/.local/node` (not on default PATH). Prefix commands
  with `export PATH="$HOME/.local/node/bin:$PATH"` or call binaries directly.
- Run checks with `npx tsc -b` and `npm run build`. Dev server: `npm run dev` (port 5173).
- Auth and all profile data are localStorage-only demo implementations — there is no backend.
- The coach chat goes through the `CoachAdapter` interface (`src/lib/coach/adapter.ts`);
  the mock implementation is the only one for now.
