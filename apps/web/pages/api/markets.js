// apps/web/pages/api/markets.js
// GET /api/markets - Fetch live markets

import {
  fetchMarkets,
  getTodayMarkets,
  fetchOrderBook,
  formatMarketForAnalysis,
} from "packages/shared/polymarket-client.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { limit = 50, today = true } = req.query;

    // Fetch markets
    const allMarkets = await fetchMarkets(parseInt(limit));

    // Filter to today's markets if requested
    const markets = today ? getTodayMarkets(allMarkets) : allMarkets;

    // Fetch orderbook data for each
    const marketsWithOdds = await Promise.all(
      markets.map(async (market) => {
        try {
          const orderbook = await fetchOrderBook(market.token_id || market.id);
          return formatMarketForAnalysis(market, orderbook);
        } catch (err) {
          console.warn(`Failed to fetch orderbook for ${market.id}`);
          return formatMarketForAnalysis(market, { midPrice: 0.5 });
        }
      })
    );

    return res.status(200).json({
      success: true,
      count: marketsWithOdds.length,
      markets: marketsWithOdds,
    });
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
