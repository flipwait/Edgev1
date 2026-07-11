# Quick Start Guide - Get Edge Bot Running in 30 Minutes

Follow these steps to go from zero to live in ~30 minutes.

## ✅ Step 1: Verify You Have Everything (5 min)

Make sure you've completed the SETUP-CHECKLIST.md:

- [ ] OpenAI API key (https://platform.openai.com/account/api-keys)
- [ ] Discord bot token (https://discord.com/developers/applications)
- [ ] Supabase URL & key (https://app.supabase.com)
- [ ] Discord channel ID (right-click channel with Developer Mode on)
- [ ] GitHub repo created
- [ ] Vercel account connected to GitHub
- [ ] Railway account ready

**If you're missing any of these, go back to SETUP-CHECKLIST.md first.**

## ✅ Step 2: Clone & Setup Project (5 min)

```bash
# Clone your repo
git clone https://github.com/yourusername/edge-bot.git
cd edge-bot

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# IMPORTANT: Open .env.local and fill in all your API keys from Step 1
# Edit .env.local in your editor
```

**Your .env.local should look like:**
```
OPENAI_API_KEY=sk-proj-xxxxx...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
DISCORD_TOKEN=MzA4NjYyNTI...
DISCORD_CLIENT_ID=308662523457898528
DISCORD_CHANNEL_ID=1234567890123456789
POLYMARKET_API_BASE=https://gamma-api.polymarket.com
VERCEL_API_URL=http://localhost:3000
NODE_ENV=development
```

**Add to .gitignore:**
```bash
echo ".env.local" >> .gitignore
```

## ✅ Step 3: Setup Database (5 min)

1. Go to your Supabase project: https://app.supabase.com
2. Click "SQL Editor" in the sidebar
3. Click "New Query"
4. Copy the entire contents of `packages/shared/db-schema.sql`
5. Paste into the Supabase query editor
6. Click "Run"
7. Wait for tables to be created

**You should see 5 tables created:**
- markets
- predictions
- alerts_sent
- outcomes
- user_configs

## ✅ Step 4: Register Discord Slash Commands (2 min)

```bash
# One-time command registration
node apps/bot/register-commands.js
```

You should see: `✅ Slash commands registered successfully!`

**Commands registered:**
- `/scan` - Run market analysis
- `/config` - Manage your settings
- `/leaderboard` - View AI accuracy stats

## ✅ Step 5: Run Locally (5 min)

**Terminal 1 - Start the web dashboard:**
```bash
npm run dev:web
```

Wait for: `ready - started server on 0.0.0.0:3000, url: http://localhost:3000`

**Terminal 2 - Start the Discord bot:**
```bash
npm run dev:bot
```

Wait for: `✅ Bot logged in as edge-bot#XXXX`

## ✅ Step 6: Test It Works

1. **Go to web dashboard:** http://localhost:3000
   - You should see the "EDGE" dashboard with "Live" tab
   - Should show some mock markets

2. **Test Discord bot:** Go to your Discord server
   - Type `/scan` and hit enter
   - Bot should respond "Scanning..."
   - Check #market-signals channel for alerts

3. **Test config:** Type `/config show`
   - Should display your default settings

4. **Test leaderboard:** Type `/leaderboard`
   - Should show "No calibration data yet" (that's normal for first run)

**If everything works, you're ready to deploy! 🎉**

## 🚀 Step 7: Deploy (Optional - Do Later)

### Deploy Web to Vercel

```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# Go to https://vercel.com
# Click "Import Project"
# Select your edge-bot GitHub repo
# Add environment variables (same as .env.local)
# Click Deploy
```

After ~1 min, you'll get a live URL: `https://edge-bot-yourname.vercel.app`

### Deploy Bot to Railway

```bash
# Go to https://railway.app
# Click "New Project"
# Select "Deploy from GitHub"
# Select your edge-bot repo
# Add environment variables (same as .env.local)
# Railway auto-deploys

# Your bot will now run 24/7 ✅
```

**Update .env.local after deployment:**
```
# After Vercel deployment, replace:
VERCEL_API_URL=https://edge-bot-yourname.vercel.app
```

Then commit and push. Railway will auto-redeploy.

## 📝 First Run Checklist

After everything is running locally:

- [ ] Dashboard loads at http://localhost:3000
- [ ] Can see "Live" tab with markets
- [ ] `/scan` command works in Discord
- [ ] Signals posted to #market-signals
- [ ] `/config show` displays settings
- [ ] `/leaderboard` shows stats (even if empty)
- [ ] Can adjust settings with `/config update`
- [ ] `.env.local` added to `.gitignore`

## 🐛 Common Issues

**"OpenAI API error"**
- Check OPENAI_API_KEY is correct
- Verify you have API credits (check https://platform.openai.com/account/billing/overview)

**"Bot not responding"**
- Make sure you registered commands: `node apps/bot/register-commands.js`
- Check bot has permissions in Discord (right-click bot → Roles)

**"Cannot connect to Supabase"**
- Verify SUPABASE_URL and SUPABASE_ANON_KEY match your project
- Make sure tables were created in Step 3

**"Database error"**
- Check Supabase RLS policies aren't blocking access
- Try running db-schema.sql again in Supabase SQL Editor

## 🎯 Next Steps

1. **Verify accuracy** - Run /leaderboard after first few scans
2. **Customize settings** - Use /config update to adjust thresholds
3. **Deploy to production** - Follow Step 7 above
4. **Monitor performance** - Track how well the AI is actually doing
5. **Iterate** - Adjust confidence thresholds based on calibration stats

## 💡 Tips

- Start with high thresholds (20pt edge, 80% sense) to only get highest-confidence signals
- Gradually lower thresholds as you see the AI's actual accuracy
- Use `/leaderboard` weekly to check calibration
- Kelly fraction: Start at 0.25 (conservative), increase as you build confidence

---

**Stuck?** Check the troubleshooting section in README.md or ask for help!

**Ready to go live?** After Step 5 works, do Step 7 to deploy to Vercel & Railway.
