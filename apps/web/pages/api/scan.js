// apps/web/pages/api/scan.js
// POST /api/scan - Run AI analysis on live markets

import {
  fetchMarkets,
  getTodayMarkets,
  fetchOrderBook,
  formatMarketForAnalysis,
} from "packages/shared/polymarket-client.js";
import { analyzeMarkets } from "packages/shared/openai-client.js";
import { db } from "packages/shared/supabase-client.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { categories = [], limit = 20 } = req.body;

    // 1. Fetch live markets
    console.log("Fetching markets from Polymarket...");
    const allMarkets = await fetchMarkets(limit);
    const todayMarkets = getTodayMarkets(allMarkets);

    if (todayMarkets.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No live markets today",
        signals: [],
      });
    }

    console.log(`Found ${todayMarkets.length} live markets`);

    // 2. Fetch orderbook data (odds) for each market
    console.log("Fetching orderbook data...");
    const marketsWithOdds = await Promise.all(
      todayMarkets.map(async (market) => {
        try {
          const orderbook = await fetchOrderBook(market.token_id || market.id);
          return {
            ...market,
            currentOdds: orderbook.midPrice,
          };
        } catch (err) {
          console.warn(`Failed to fetch orderbook for ${market.id}:`, err.message);
          return { ...market, currentOdds: 0.5 };
        }
      })
    );

    // 3. Analyze markets with OpenAI
    console.log(`Analyzing ${marketsWithOdds.length} markets with OpenAI...`);
    const analyses = await analyzeMarkets(marketsWithOdds);

    // 4. Store predictions in Supabase
    console.log("Storing predictions in database...");
    const signals = [];

    for (let i = 0; i < marketsWithOdds.length; i++) {
      const market = marketsWithOdds[i];
      const analysis = analyses[i];

      if (analysis.error) {
        console.warn(`Skipping market ${market.id}: ${analysis.error}`);
        continue;
      }

      // Calculate edge
      const edge = Math.abs(analysis.aiProbability - market.currentOdds);

      // Store market in DB
      try {
        await db.upsertMarket({
          polymarket_id: market.id,
          question: market.question,
          category: market.category || "Other",
          resolves_at: market.resolves_at || market.endsAt,
        });

        // Fetch the market ID from DB
        const dbMarket = await db.getMarket(market.id);

        // Store prediction
        const prediction = await db.insertPrediction({
          market_id: dbMarket.id,
          ai_probability: analysis.aiProbability,
          market_probability: market.currentOdds,
          confidence: analysis.confidence,
          reasoning: analysis.reasoning,
          model_used: "gpt-4o-mini",
        });

        signals.push({
          market: {
            id: market.id,
            question: market.question,
            category: market.category || "Other",
          },
          analysis,
          edge: Math.round(edge * 100),
          prediction: prediction[0],
        });
      } catch (dbErr) {
        console.error(`Failed to store prediction for ${market.id}:`, dbErr);
      }
    }

    return res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      marketsAnalyzed: marketsWithOdds.length,
      signalsFound: signals.length,
      signals: signals,
    });
  } catch (error) {
    console.error("Scan failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
