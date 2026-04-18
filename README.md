# ⚡ Spark — The Universal Cognitive Ignition Platform

Full-stack web app. 7-minute cognitive warm-up before any focus task.
See `Spark_PRD_v2.docx` (v3 in chat) for the full product spec.

## Layout

```
spark/
├── client/       # React 18 + TypeScript + Vite + Tailwind + Framer Motion
└── server/       # Node.js + Express + Supabase + Gemini 1.5 Flash
```

## Prerequisites

- Node 20+ (tested on 24)
- A Supabase project (URL, anon key, service-role key)
- A Gemini 1.5 Flash API key (Google AI Studio)

## Local development

```bash
# 1 — install
cd client && npm install
cd ../server && npm install

# 2 — copy .env.example → .env in both client/ and server/
#     then fill in your Supabase + Gemini keys
cp client/.env.example client/.env
cp server/.env.example server/.env

# 3 — run (two terminals)
cd server && npm run dev    # http://localhost:8787
cd client && npm run dev    # http://localhost:5173
```

Health check: `curl http://localhost:8787/api/health`

## Stages

- [x] **Stage 0** — Monorepo restructure, env scaffolding, client preserved & building
- [ ] **Stage 1** — Server (Express routes, GeminiService, ScoringService, validators, fallbacks)
- [ ] **Stage 2** — Supabase schema + RLS + seed
- [ ] **Stage 3** — Client rewiring (Zustand, api.ts, i18n, RTL, real API calls)
- [ ] **Stage 4** — End-to-end smoke test

## Security

- `.env` files are gitignored.
- Gemini + Supabase service-role key live on the server only.
- The client only holds the Supabase anon key + JWT issued by Supabase Auth.
