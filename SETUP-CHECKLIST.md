# Edge Bot - Complete Setup Checklist

## 🎯 Overview
This checklist covers everything needed to deploy the Polymarket AI betting signal bot. Break it into three phases: **Pre-Setup, Account Creation, Configuration**.

---

## PHASE 1: PRE-SETUP (Do First)

### GitHub
- [ ] Create a new GitHub repo called `edge-bot` (or your preferred name)
- [ ] Clone it locally
- [ ] Create a `.gitignore` file (we'll populate it later with secrets)

### Accounts You'll Need (Free Tier Where Possible)
- [ ] OpenAI account (API key) — paid, but you control spend
- [ ] Discord Developer Portal account
- [ ] GitHub account (already have one)
- [ ] Vercel account (free tier supports this)
- [ ] Railway account (free tier for basic bot)
- [ ] Supabase account (free tier Postgres DB)
- [ ] Polymarket account (optional but useful for testing)

---

## PHASE 2: ACCOUNT CREATION & API KEYS

### OpenAI API
**Purpose:** AI market analysis and probability estimation
- [ ] Go to https://platform.openai.com/account/api-keys
- [ ] Create a new API key
- [ ] Store it safely (we'll add to environment variables)
- [ ] **Cost:** ~$0.01-0.05 per scan depending on market count (model: `gpt-4o-mini` or `gpt-3.5-turbo`)
- [ ] Set up usage limits at https://platform.openai.com/account/billing/limits to avoid surprise charges

### Discord Bot Setup
**Purpose:** Post alerts and handle slash commands
- [ ] Go to https://discord.com/developers/applications
- [ ] Click "New Application" → name it "edge-bot"
- [ ] Go to "Bot" tab → click "Add Bot"
- [ ] Under TOKEN, click "Copy" → save this securely (we'll use it later)
- [ ] Enable these **Intents** (toggle on):
  - [ ] Message Content Intent
  - [ ] Server Members Intent
- [ ] Go to "OAuth2" → "URL Generator"
  - [ ] Select scopes: `bot`
  - [ ] Select permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
  - [ ] Copy the generated URL and open it to add bot to your Discord server
- [ ] Create a Discord channel called `#market-signals` (or use existing one)
- [ ] Get the channel ID:
  - [ ] Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
  - [ ] Right-click `#market-signals` → "Copy Channel ID"
  - [ ] Save this ID

### Polymarket API
**Purpose:** Fetch live market data and odds
- [ ] No API key needed for public data (read-only)
- [ ] Base URL: `https://gamma-api.polymarket.com`
- [ ] Endpoints we'll use:
  - [ ] `/markets` — list all markets
  - [ ] `/markets/{id}` — get market details
  - [ ] `/clob/orderbook/{token_id}` — get live order book / odds
- [ ] Documentation: https://docs.polymarket.com/
- [ ] **Note:** You'll need to handle Polymarket's rate limits (usually 1000 req/min is fine)

### Supabase Database
**Purpose:** Store predictions, outcomes, alerts, user configs
- [ ] Go to https://supabase.com
- [ ] Create a new project
- [ ] Wait for it to initialize
- [ ] Go to Project Settings → API → copy:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_ANON_KEY` (public read/write to specific tables)
- [ ] Go to SQL Editor and run the schema (we'll provide this in Phase 3)

---

## PHASE 3: SERVICES & DEPLOYMENT SETUP

### Vercel (Frontend + API Routes)
**Purpose:** Host Next.js app and serverless API functions
- [ ] Go to https://vercel.com
- [ ] Sign in with GitHub
- [ ] Import your `edge-bot` repo
- [ ] Vercel will auto-detect it's a Next.js app
- [ ] In "Environment Variables", add:
  - [ ] `OPENAI_API_KEY` (from Phase 2)
  - [ ] `SUPABASE_URL` (from Supabase)
  - [ ] `SUPABASE_ANON_KEY` (from Supabase)
  - [ ] `DISCORD_CHANNEL_ID` (from Discord)
  - [ ] `POLYMARKET_API_BASE` = `https://gamma-api.polymarket.com`
- [ ] Deploy (Vercel will deploy on every push to main)
- [ ] Your app will be live at `https://edge-bot-yourname.vercel.app` (or custom domain)

### Railway (Discord Bot Process)
**Purpose:** Run the bot 24/7 (persistent WebSocket connection)
- [ ] Go to https://railway.app
- [ ] Create a new project
- [ ] Connect your GitHub repo
- [ ] Railway will auto-detect `package.json` and deploy
- [ ] In "Variables", add:
  - [ ] `DISCORD_TOKEN` (from Discord)
  - [ ] `DISCORD_CHANNEL_ID` (from Discord)
  - [ ] `SUPABASE_URL` (from Supabase)
  - [ ] `SUPABASE_ANON_KEY` (from Supabase)
  - [ ] `NODE_ENV` = `production`
  - [ ] `VERCEL_API_URL` = your Vercel URL from above
- [ ] Railway will keep it running and restart on crashes
- [ ] Free tier: 500 hours/month (enough for always-on)

### Supabase Tables (Database Schema)
You'll need to create these tables in Supabase. We'll provide the SQL, but the structure is:

- [ ] **`markets`**
  - id (UUID, primary key)
  - polymarket_id (text, unique)
  - question (text)
  - category (text)
  - resolves_at (timestamp)
  - created_at (timestamp)

- [ ] **`predictions`**
  - id (UUID, primary key)
  - market_id (UUID, foreign key to markets)
  - ai_probability (decimal 0-1)
  - market_probability (decimal 0-1)
  - edge (decimal, calculated)
  - confidence (decimal 0-1)
  - reasoning (text)
  - model_used (text, e.g., "gpt-4o-mini")
  - created_at (timestamp)

- [ ] **`alerts_sent`**
  - id (UUID, primary key)
  - prediction_id (UUID, foreign key)
  - discord_message_id (text)
  - discord_channel_id (text)
  - sent_at (timestamp)

- [ ] **`outcomes`**
  - market_id (UUID, foreign key)
  - resolved_value (0 or 1, NO or YES)
  - resolved_at (timestamp)

- [ ] **`user_configs`** (per Discord user/server)
  - discord_user_id (text, primary key)
  - min_edge (decimal, e.g., 0.15)
  - min_confidence (decimal, e.g., 0.65)
  - bankroll (integer, e.g., 1000)
  - kelly_fraction (decimal, e.g., 0.35)
  - alert_channel_id (text)
  - created_at (timestamp)

---

## PHASE 4: ENVIRONMENT VARIABLES

Create a `.env.local` file in your repo root (add to `.gitignore`):

```bash
# OpenAI
OPENAI_API_KEY=sk-proj-xxxxx...

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Discord
DISCORD_TOKEN=MzA4NjYyNTIzNDU3ODk4NTI4.DXcbpQ...
DISCORD_CHANNEL_ID=1234567890123456789

# Polymarket
POLYMARKET_API_BASE=https://gamma-api.polymarket.com

# Deployment
VERCEL_API_URL=https://edge-bot-yourname.vercel.app
NODE_ENV=development
```

**For Railway & Vercel:** Add these same variables in their dashboard (not in `.env` file, in their UI).

---

## PHASE 5: REPO STRUCTURE (What We'll Build)

```
edge-bot/
├── apps/
│   ├── web/
│   │   ├── pages/
│   │   │   ├── index.js           (React dashboard)
│   │   │   ├── api/
│   │   │   │   ├── scan.js        (POST /api/scan — run AI analysis)
│   │   │   │   ├── markets.js     (GET /api/markets — fetch Polymarket data)
│   │   │   │   ├── config.js      (GET/POST user settings)
│   │   │   │   └── leaderboard.js (GET calibration stats)
│   │   ├── public/
│   │   ├── styles/
│   │   ├── package.json
│   │   └── vercel.json
│   │
│   └── bot/
│       ├── index.js               (Discord bot entry point)
│       ├── commands/
│       │   ├── scan.js            (slash command /scan)
│       │   ├── config.js          (slash command /config)
│       │   ├── watch.js           (slash command /watch)
│       │   └── leaderboard.js     (slash command /leaderboard)
│       ├── utils/
│       │   ├── supabase.js        (DB client)
│       │   ├── openai.js          (OpenAI client)
│       │   ├── polymarket.js      (Polymarket API client)
│       │   └── embeds.js          (Discord embed formatters)
│       ├── package.json
│       └── ecosystem.config.js    (PM2 config for Railway)
│
├── packages/
│   └── shared/
│       ├── index.js
│       ├── db-schema.sql
│       ├── constants.js
│       └── utils.js
│
├── .github/
│   └── workflows/
│       ├── deploy-web.yml         (Auto-deploy web to Vercel)
│       └── deploy-bot.yml         (Auto-deploy bot to Railway)
│
├── .env.local                      (ADD TO .gitignore)
├── .gitignore
├── README.md
└── package.json                    (root workspace)
```

---

## PHASE 6: PRE-LAUNCH CHECKLIST

Before we start coding, verify:

### Accounts Created & Verified
- [ ] OpenAI API key works (test with a simple curl)
- [ ] Discord bot token works (check it shows in Discord)
- [ ] Supabase project created and accessible
- [ ] Vercel project linked to GitHub
- [ ] Railway project linked to GitHub
- [ ] Polymarket API responds (test in Postman or curl)

### Environment Variables Set Up
- [ ] All variables in `.env.local` (local dev)
- [ ] All variables in Vercel dashboard
- [ ] All variables in Railway dashboard
- [ ] `.env.local` in `.gitignore` ✅

### Discord Server Ready
- [ ] Bot added to your Discord server
- [ ] `#market-signals` channel created (or chosen)
- [ ] Channel ID stored
- [ ] Bot has permission to post embeds

### GitHub Repo Ready
- [ ] Repo cloned locally
- [ ] `.gitignore` includes `.env.local`, `node_modules/`, `.next/`
- [ ] Initial commit pushed
- [ ] Vercel & Railway are watching the repo

---

## COSTS & LIMITS

| Service | Free Tier | Cost | Notes |
|---------|-----------|------|-------|
| **OpenAI** | None | ~$0.01-0.05/scan | Depends on # markets analyzed |
| **Vercel** | ✅ 100GB bandwidth/mo | $20+/mo (if needed) | Serverless functions included |
| **Railway** | ✅ 500 hrs/mo + $5 credit | $5+/mo (if over) | Enough for bot 24/7 |
| **Supabase** | ✅ 500MB DB + 2GB bandwidth | $25+/mo (if scaled) | Plenty for our data volume |
| **Discord** | ✅ Free | Free | No costs |
| **Polymarket API** | ✅ Free | Free | Public data only |
| **GitHub** | ✅ Free | Free | Public repo |

**Estimated monthly cost:** $0-20 (just OpenAI calls, everything else free tier)

---

## NEXT STEPS

Once you complete this checklist:

1. ✅ Tell me you've done Phase 1-4
2. We'll scaffold the `/apps/web` (Next.js frontend + API routes)
3. We'll scaffold `/apps/bot` (Discord bot)
4. We'll build `/packages/shared` (utilities & DB schema)
5. We'll test everything locally
6. We'll deploy to Vercel & Railway
7. You'll click "SCAN" and see Discord alerts 🎉

---

## Quick Reference: API Endpoints You'll Use

### Polymarket (Read-Only, No Auth)
```
GET https://gamma-api.polymarket.com/markets
GET https://gamma-api.polymarket.com/markets?limit=50
GET https://gamma-api.polymarket.com/markets/{id}
GET https://gamma-api.polymarket.com/clob/orderbook/{token_id}
```

### Supabase (Auth via ANON_KEY)
```
POST https://{PROJECT_ID}.supabase.co/rest/v1/predictions
GET  https://{PROJECT_ID}.supabase.co/rest/v1/predictions?market_id=eq.{id}
GET  https://{PROJECT_ID}.supabase.co/rest/v1/user_configs?discord_user_id=eq.{id}
```

### Your Vercel API (from Discord Bot or Frontend)
```
POST /api/scan          (run AI analysis on markets)
GET  /api/markets       (get live markets)
GET  /api/config        (get user settings)
POST /api/config        (update user settings)
GET  /api/leaderboard   (calibration stats)
```

---

**Questions?** Let me know if any step is unclear, or if you need help with any specific service setup.
