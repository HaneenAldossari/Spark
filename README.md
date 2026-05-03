# Spark

**A 5-minute cognitive warm-up that primes your brain for deep focus before you start working.**

[Live demo](https://spark-coral-kappa.vercel.app) · [Report an issue](https://github.com/HaneenAldossari/Spark/issues)

---

## The premise

You are not lazy. Your prefrontal cortex needs 6–20 minutes of graduated activation before it can hold deep focus, and willpower can't skip that step. Most focus apps track time *after* focus begins — Spark creates the focus state *before* the timer starts.

Five minutes. Five games. No subscription. No tracking. No data.

## What it does

1. **Declare** — pick the task you're about to start (studying, coding, writing, math, design, reading, presenting, other)
2. **Preview** — see the 5 games selected for that task type, drawn from a pool of 7
3. **Warm up** — play each game (10–60 seconds each), with a per-game intro screen and a result card between rounds
4. **Check in** — one question on your current state; if you're nervous, a 24-second box-breathing exercise is added before the score
5. **Focus Score** — a 0–100 readiness number with three honest tiers (Ready · Almost · Not Ready)

The 7 games in the pool train different cognitive domains: **Schulte Table** (visual scanning), **N-Back** (working memory), **Speed Math** (processing speed), **Stroop / Color Clash** (inhibitory control), **Navon Letters** (local-vs-global focus), **Mental Rotation** (spatial reasoning), and **Color Flow / Dot Connect** (spatial planning).

Each task category gets a curated 5-game set — coding sessions emphasize working memory and spatial planning; writing emphasizes inhibition and visual scanning; math emphasizes speed and pattern.

## Features

- **Task-aware game selection.** 5 games chosen from a pool of 7 per task type — no two task types play the same set.
- **Live cognitive rating.** Per-game scores feed an ELO-style update across 5 cognitive domains (logic, language, math, pattern, general). Played-game categories shift; untouched categories stay put.
- **Bilingual.** Full English and Arabic locales with RTL layout, formal Modern Standard Arabic, and Hindi-Arabic numerals throughout the Arabic prose.
- **Skip with consequence.** Skipping any game scores 0 for that game — no fake partial credit.
- **AI-generated session content.** Each session uses Gemini 1.5 Flash to generate a personalized story, a battle question, and a launch message keyed to the player's declared task.
- **No accounts. No data saved.** The app is fully public and stateless — every visitor is a guest, every session is ephemeral, no cookies, no tracking.

## Tech stack

**Client** — React 19 · TypeScript · Vite · Tailwind v4 · Framer Motion · Zustand · React Router 7

**Server** — Node 20 · Express 5 · Zod · Gemini 1.5 Flash API

**Hosting** — [Vercel](https://vercel.com) (client, Hobby tier) · [Railway](https://railway.com) (server, Hobby tier)

**Design tokens** — cream `#F5F0E8` page background, ink `#111111`, accent `#534AB7`, Fraunces serif display font.

## Project structure

```
spark/
├── client/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── games/         # 7 game components + shared shell
│   │   │   └── session/       # Preview, prime, transition, result, check-in, breathe, focus-score
│   │   ├── pages/             # Welcome, TaskDeclare, Session
│   │   ├── lib/               # Zustand store, API client, types
│   │   └── i18n/              # en.ts and ar.ts catalogues
│   └── vercel.json            # SPA rewrites
├── server/                    # Express API
│   ├── src/
│   │   ├── routes/            # /api/session/start, /api/session/complete
│   │   ├── services/          # SessionService, ScoringService, GeminiService, SupabaseService
│   │   └── middleware/        # rate limiting
│   └── Dockerfile             # for Railway deploy
├── Dockerfile                 # root-level (used by Railway)
├── railway.json               # Railway build/deploy config
└── AR_COPY_NOTES.md           # Arabic copywriting voice guide + glossary
```

## Local development

**Prerequisites:** Node 20+ and a Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
# 1. Clone and install
git clone https://github.com/HaneenAldossari/Spark.git
cd Spark
cd client && npm install && cd ..
cd server && npm install && cd ..

# 2. Set up environment variables
cp client/.env.example client/.env
cp server/.env.example server/.env
# Edit server/.env and paste your Gemini key into GEMINI_API_KEY

# 3. Run (two terminals)
cd server && npm run dev    # http://localhost:8787
cd client && npm run dev    # http://localhost:5173
```

Sanity check the server: `curl http://localhost:8787/api/health` should return `{"ok": true, ...}`.

## Deployment

The live build ships from this repo automatically on every push to `main`:

- **Client** → Vercel reads `client/vercel.json`, builds `npm run build` from the `client/` root, serves the `dist/` output. SPA fallback rewrites all unknown paths to `/`.
- **Server** → Railway reads `railway.json` at the repo root, builds the `Dockerfile` (Node 20 Alpine, copies `server/`, runs `npm start` → `tsx src/index.ts`), and exposes the service over HTTPS.

Environment variables required on the server: `GEMINI_API_KEY`. CORS is wide open since the app has no credentials to scope.

## Built with AI tools

This project was built solo in 5 days using AI tools as a force multiplier:

- **[Claude Code](https://claude.com/claude-code)** — pair-programming partner for implementation, refactors, and debugging
- **[Gemini 1.5 Flash](https://aistudio.google.com)** — runtime AI for generating per-session story / question / launch-message content
- **[Google Stitch](https://stitch.withgoogle.com)** — design ideation and visual exploration

Every architectural decision, scoring formula, copy choice, debug path, and product trade-off was made by me. AI accelerated the implementation; it didn't replace the design judgment.

## Architecture notes

A few decisions worth surfacing:

- **No persistence.** The app was originally built with Supabase auth + per-user session history + a leaderboard; all of that was stripped to make the app fully public. The session-complete endpoint accepts a payload but doesn't write it anywhere — this keeps the app trivially deployable, GDPR-irrelevant, and free to host.
- **Per-game ELO.** Each game's 0–100 score feeds an ELO update against its mapped category (e.g., Stroop → language, Navon → logic + language). K-factor 32, anchor 1200, clamped to [400, 2400]. Two-category games run the update twice. Categories whose games weren't played stay untouched.
- **Schulte locked to 4×4.** Earlier versions scaled the grid with cognitive rating (4×4 / 5×5 / 6×6); product decision in April 2026 locked it to 4×4 with a tighter 12-second reference time and a steeper −4 pts/sec penalty.
- **IPv6 binding.** Railway's internal router uses IPv6, so the Express server binds to `::` (dual-stack) instead of `0.0.0.0`. Without this, the public URL returns 502 even when the container is up.
- **Vercel target port.** Railway's auto-detection initially wired the public domain to port 5173 (the Vite dev port from `client/`); the actual API binds to whatever Railway injects via `PORT`. Fixed via a GraphQL mutation to set `targetPort: 8080`.

## Acknowledgments

Game models drawn from established cognitive psychology paradigms — N-Back (Kirchner, 1958), Stroop (Stroop, 1935), Schulte (Schulte, 1949), Navon (Navon, 1977), Mental Rotation (Shepard & Metzler, 1971). The product framing — "your prefrontal cortex needs 6–20 minutes of graduated activation" — synthesizes findings from neuroimaging research on default-mode network suppression and PFC engagement during attention tasks.

## License

MIT — see [LICENSE](LICENSE).

---

*Made with care, in 5 days. — [Haneen Aldossari](https://github.com/HaneenAldossari)*
