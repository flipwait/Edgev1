# Edge Bot - AI Prediction Market Signal Bot

A full-stack AI-powered betting signal system that analyzes Polymarket predictions using OpenAI, posts alerts to Discord, and tracks calibration accuracy.

## 🎯 What It Does

1. **Scans live markets** from Polymarket daily
2. **Analyzes with OpenAI** to estimate probability of YES outcomes
3. **Compares** AI estimate vs market odds to find edge
4. **Posts Discord alerts** when signals meet your criteria
5. **Tracks accuracy** to show how well the AI is actually doing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Next.js Frontend (Vercel)                  │
│  - Live market dashboard                    │
│  - Scan trigger button                      │
│  - Config panel                             │
└────────────────┬────────────────────────────┘
                 │ POST /api/scan
                 ↓
┌─────────────────────────────────────────────┐
│  Vercel Serverless Functions                │
│  - Fetch Polymarket data                    │
│  - Call OpenAI for analysis                 │
│  - Store predictions in Supabase            │
└────────────────┬────────────────────────────┘
                 │ Updates DB
                 ↓
┌─────────────────────────────────────────────┐
│  Supabase Postgres DB                       │
│  - Markets, predictions, outcomes           │
│  - Alerts sent, user configs                │
└─────────────────────────────────────────────┘
                 ↑
                 │ Webhook
┌─────────────────────────────────────────────┐
│  Discord Bot (Railway)                      │
│  - /scan command                            │
│  - /config command                          │
│  - /leaderboard command                     │
│  - Posts embeds to #market-signals          │
└─────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Accounts created (see SETUP-CHECKLIST.md):
  - OpenAI
  - Discord Developer Portal
  - Supabase
  - Vercel
  - Railway

### Local Development Setup

1. **Clone and install**
```bash
git clone https://github.com/yourusername/edge-bot.git
cd edge-bot

npm install
npm run build
```

2. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

3. **Set up database**
- Go to Supabase SQL Editor
- Paste contents of `packages/shared/db-schema.sql`
- Run it

4. **Register Discord commands** (one time)
```bash
node apps/bot/register-commands.js
```

5. **Run locally**
```bash
# Terminal 1: Next.js frontend (http://localhost:3000)
npm run dev:web

# Terminal 2: Discord bot
npm run dev:bot
```

## 📦 File Structure

```
edge-bot/
├── apps/
│   ├── web/                    # Next.js dashboard & API routes
│   │   ├── pages/
│   │   │   ├── index.js       # Dashboard UI
│   │   │   └── api/
│   │   │       ├── scan.js    # POST /api/scan
│   │   │       ├── markets.js # GET /api/markets
│   │   │       ├── config.js  # GET/POST /api/config
│   │   │       └── leaderboard.js
│   │   └── package.json
│   │
│   └── bot/                    # Discord.js bot
│       ├── index.js           # Main bot logic
│       ├── register-commands.js
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared utilities
│       ├── constants.js
│       ├── db-schema.sql
│       ├── supabase-client.js
│       ├── openai-client.js
│       └── polymarket-client.js
│
├── .env.example
├── .env.local                  # ⚠️ Add to .gitignore
├── package.json
└── README.md
```

## 🔑 Key API Routes

### `/api/scan` (POST)
Runs AI analysis on live markets.

Request:
```json
{
  "categories": [],
  "limit": 20
}
```

Response:
```json
{
  "success": true,
  "timestamp": "2024-01-15T14:30:00Z",
  "marketsAnalyzed": 15,
  "signalsFound": 3,
  "signals": [
    {
      "market": {
        "id": "abc123",
        "question": "Will the Chiefs win?",
        "category": "Sports"
      },
      "analysis": {
        "aiProbability": 0.74,
        "confidence": 0.91,
        "reasoning": "..."
      },
      "edge": 16
    }
  ]
}
```

### `/api/markets` (GET)
Fetch live markets with current odds.

```
GET /api/markets?limit=50&today=true
```

### `/api/config` (GET/POST)
Get or update user alert settings.

```
GET  /api/config?discordUserId=123456789
POST /api/config?discordUserId=123456789
Body: { "min_edge": 0.15, "min_confidence": 0.65, ... }
```

### `/api/leaderboard` (GET)
Get AI calibration stats and prediction accuracy.

```
GET /api/leaderboard?limit=100
```

## 🤖 Discord Commands

### `/scan`
Run market analysis and post signals to your channel.

```
/scan
```

### `/config show`
View your current alert settings.

```
/config show
```

### `/config update`
Update your thresholds.

```
/config update min-edge:0.20 min-confidence:0.70 bankroll:2000
```

### `/leaderboard`
Show AI accuracy and calibration stats.

```
/leaderboard
```

## 💰 Cost Breakdown

| Service | Cost | Notes |
|---------|------|-------|
| OpenAI | $0.01-0.05/scan | Pay-per-token, you control spend |
| Vercel | Free (tier 1) | Up to 100GB bandwidth/month |
| Railway | Free (tier 1) | 500 hours/month, enough for 24/7 bot |
| Supabase | Free (tier 1) | 500MB DB, 2GB bandwidth |
| Discord | Free | Native platform |
| Polymarket API | Free | Public read-only data |

**Monthly estimate:** $0-5 (just OpenAI)

## 🚀 Deployment

### Deploy to Vercel (Frontend + API)

1. Push to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Auto-deploys on push

### Deploy to Railway (Discord Bot)

1. Push to GitHub
2. Create new project on Railway
3. Link GitHub repo
4. Add environment variables
5. Railway auto-deploys and keeps it running 24/7

## 🔄 Workflow

1. **User opens dashboard** → sees today's live markets
2. **User clicks "SCAN FOR SIGNALS"**
3. **API fetches** Polymarket data, calls OpenAI, stores predictions
4. **Bot filters** signals by user's criteria
5. **Bot posts** embeds to Discord #market-signals
6. **User sees** signals in Discord and can act on them
7. **Bot logs** outcomes when markets resolve
8. **User checks** `/leaderboard` to see AI accuracy

## 📊 Data Model

### Markets
- polymarket_id, question, category, resolves_at

### Predictions
- market_id, ai_probability, market_probability, edge, confidence, reasoning

### Alerts Sent
- prediction_id, discord_message_id, sent_at

### Outcomes
- market_id, resolved_value (0=NO, 1=YES), resolved_at

### User Configs
- discord_user_id, min_edge, min_confidence, bankroll, kelly_fraction

## 🛠️ Troubleshooting

**Bot not responding to commands?**
- Ensure slash commands are registered: `node apps/bot/register-commands.js`
- Check bot permissions in Discord (Send Messages, Embed Links)
- Verify DISCORD_TOKEN and DISCORD_CLIENT_ID are correct

**Scan returns no signals?**
- Check if OPENAI_API_KEY is valid
- Verify Supabase connection with: `npm run test:db`
- Try lowering thresholds in /config

**API rate limits?**
- OpenAI: Default 20 requests/min, upgrade if needed
- Polymarket: Usually 1000 req/min, no auth needed
- Add delays between batch requests

## 📈 Improving Accuracy

1. **Track calibration** via `/leaderboard` to see patterns
2. **Adjust confidence threshold** if AI is overconfident
3. **Use category filters** to specialize in sports vs politics
4. **Test kelly_fraction** values (lower = safer)

## 🔐 Security

- ✅ Environment variables in `.env.local` (not committed)
- ✅ Supabase RLS policies enforced
- ✅ No sensitive keys in frontend code
- ✅ API keys stored server-side only

## 📝 License

MIT

## 🤝 Contributing

Suggestions? Found a bug? Open an issue or PR!

---

**Questions?** Check SETUP-CHECKLIST.md for detailed setup instructions.
