-- Supabase SQL Schema for Edge Bot
-- Run this in your Supabase project's SQL Editor

-- Markets table
CREATE TABLE IF NOT EXISTS public.markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  polymarket_id TEXT UNIQUE NOT NULL,
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  resolves_at TIMESTAMP WITH TIME ZONE,
  market_status TEXT DEFAULT 'active', -- active, resolved, canceled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table (AI analysis results)
CREATE TABLE IF NOT EXISTS public.predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL REFERENCES public.markets(id),
  ai_probability DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  market_probability DECIMAL(3,2) NOT NULL,
  edge DECIMAL(3,2) GENERATED ALWAYS AS (ABS(ai_probability - market_probability)) STORED,
  confidence DECIMAL(3,2) NOT NULL, -- 0.00 to 1.00
  reasoning TEXT,
  model_used TEXT DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts sent to Discord
CREATE TABLE IF NOT EXISTS public.alerts_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prediction_id UUID NOT NULL REFERENCES public.predictions(id),
  discord_message_id TEXT,
  discord_channel_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Outcomes (results after market resolves)
CREATE TABLE IF NOT EXISTS public.outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID NOT NULL UNIQUE REFERENCES public.markets(id),
  resolved_value INTEGER NOT NULL, -- 0 = NO, 1 = YES
  resolved_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User configurations per Discord user
CREATE TABLE IF NOT EXISTS public.user_configs (
  discord_user_id TEXT PRIMARY KEY,
  min_edge DECIMAL(3,2) DEFAULT 0.15, -- 15% minimum edge
  min_confidence DECIMAL(3,2) DEFAULT 0.65, -- 65% minimum sense
  bankroll INTEGER DEFAULT 1000, -- in dollars
  kelly_fraction DECIMAL(3,2) DEFAULT 0.35, -- 0.35x Kelly
  alert_channel_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Calibration view (for leaderboard)
CREATE OR REPLACE VIEW public.prediction_accuracy AS
SELECT 
  p.id,
  p.market_id,
  m.question,
  m.category,
  p.ai_probability,
  p.confidence,
  o.resolved_value,
  (CASE 
    WHEN o.resolved_value = 1 AND p.ai_probability >= 0.5 THEN 1
    WHEN o.resolved_value = 0 AND p.ai_probability < 0.5 THEN 1
    ELSE 0
  END) as was_correct,
  ABS(CASE WHEN o.resolved_value = 1 THEN (1.0 - p.ai_probability) ELSE p.ai_probability END) as error,
  p.created_at,
  o.resolved_at
FROM public.predictions p
JOIN public.markets m ON p.market_id = m.id
LEFT JOIN public.outcomes o ON m.id = o.market_id
WHERE o.resolved_at IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON public.predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON public.predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_alerts_sent_prediction_id ON public.alerts_sent(prediction_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_market_id ON public.outcomes(market_id);

-- Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts_sent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_configs ENABLE ROW LEVEL SECURITY;

-- Public read access to predictions (so frontend can fetch calibration)
CREATE POLICY "Allow public read access to predictions" ON public.predictions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to markets" ON public.markets FOR SELECT USING (true);
CREATE POLICY "Allow public read access to outcomes" ON public.outcomes FOR SELECT USING (true);

-- Only allow service role (API) to insert/update
CREATE POLICY "Allow only service role to insert predictions" ON public.predictions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow only service role to update predictions" ON public.predictions FOR UPDATE USING (true);
