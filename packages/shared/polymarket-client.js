// packages/shared/polymarket-client.js
// Polymarket API client for fetching live market data

import { POLYMARKET_API_BASE, CATEGORIES } from "./constants.js";

const BASE_URL = POLYMARKET_API_BASE;

/**
 * Fetch all active markets from Polymarket
 */
export async function fetchMarkets(limit = 50) {
  try {
    const response = await fetch(`${BASE_URL}/markets?limit=${limit}&active=true`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const markets = await response.json();
    return markets || [];
  } catch (error) {
    console.error("Failed to fetch markets:", error);
    throw error;
  }
}

/**
 * Fetch a specific market by ID
 */
export async function fetchMarket(marketId) {
  try {
    const response = await fetch(`${BASE_URL}/markets/${marketId}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Failed to fetch market ${marketId}:`, error);
    throw error;
  }
}

/**
 * Fetch order book / current odds for a market
 */
export async function fetchOrderBook(tokenId) {
  try {
    const response = await fetch(`${BASE_URL}/clob/orderbook/${tokenId}`, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Polymarket API error: ${response.status}`);
    }

    const orderbook = await response.json();
    
    // Extract bid/ask to calculate mid-price (current odds)
    if (orderbook.bids && orderbook.asks && orderbook.bids.length > 0 && orderbook.asks.length > 0) {
      const bestBid = parseFloat(orderbook.bids[0].price);
      const bestAsk = parseFloat(orderbook.asks[0].price);
      const midPrice = (bestBid + bestAsk) / 2;
      
      return {
        bid: bestBid,
        ask: bestAsk,
        midPrice: Math.max(0, Math.min(1, midPrice)), // Clamp 0-1
        orderbook: orderbook,
      };
    }

    return { midPrice: 0.5, orderbook };
  } catch (error) {
    console.error(`Failed to fetch orderbook ${tokenId}:`, error);
    throw error;
  }
}

/**
 * Filter markets by category and resolves time
 */
export function filterMarkets(markets, options = {}) {
  const {
    categories = [],
    resolvesAfter = null,
    resolvesBefore = null,
  } = options;

  return markets.filter((market) => {
    // Filter by category if specified
    if (categories.length > 0) {
      const marketCategory = inferCategory(market.question);
      if (!categories.includes(marketCategory)) {
        return false;
      }
    }

    // Filter by resolution time
    if (resolvesAfter) {
      const resolveTime = new Date(market.resolves_at || market.endsAt);
      if (resolveTime < new Date(resolvesAfter)) {
        return false;
      }
    }

    if (resolvesBefore) {
      const resolveTime = new Date(market.resolves_at || market.endsAt);
      if (resolveTime > new Date(resolvesBefore)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Get only today's live/upcoming markets (within 24 hours)
 */
export function getTodayMarkets(markets) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  return markets.filter((market) => {
    const resolveTime = new Date(market.resolves_at || market.endsAt);
    return resolveTime >= now && resolveTime <= tomorrow;
  });
}

/**
 * Infer market category from question text
 */
export function inferCategory(question) {
  const q = question.toLowerCase();

  if (q.includes("sport") || q.includes("game") || q.includes("playoff") || 
      q.includes("nfl") || q.includes("nba") || q.includes("mlb") || 
      q.includes("premier league") || q.includes("vs") || q.includes("will") && 
      (q.includes("win") || q.includes("cover") || q.includes("goal"))) {
    return "Sports";
  }

  if (q.includes("bitcoin") || q.includes("ethereum") || q.includes("eth") || 
      q.includes("crypto") || q.includes("btc") || q.includes("etf") || q.includes("xrp")) {
    return "Crypto";
  }

  if (q.includes("election") || q.includes("congress") || q.includes("senate") || 
      q.includes("vote") || q.includes("government") || q.includes("shutdown") || 
      q.includes("president") || q.includes("legislation")) {
    return "Politics";
  }

  if (q.includes("openai") || q.includes("gpt") || q.includes("ai model") || 
      q.includes("release") || q.includes("tech") || q.includes("software")) {
    return "Tech";
  }

  if (q.includes("economy") || q.includes("interest rate") || q.includes("fed") || 
      q.includes("unemployment") || q.includes("gdp") || q.includes("revenue") || 
      q.includes("earnings")) {
    return "Business";
  }

  if (q.includes("scientific") || q.includes("discovery") || q.includes("nobel") || 
      q.includes("space") || q.includes("nasa") || q.includes("climate")) {
    return "Science";
  }

  return "Other";
}

/**
 * Format market data for display/analysis
 */
export function formatMarketForAnalysis(market, orderbook) {
  return {
    id: market.id,
    polymarketId: market.id,
    question: market.question,
    category: inferCategory(market.question),
    currentOdds: orderbook?.midPrice || 0.5,
    resolves: formatResolveTime(market.resolves_at || market.endsAt),
    resolvesAt: market.resolves_at || market.endsAt,
    status: market.active ? "active" : "inactive",
  };
}

/**
 * Format resolve time for display
 */
export function formatResolveTime(isoTime) {
  if (!isoTime) return "Unknown";

  const date = new Date(isoTime);
  const now = new Date();
  const diffMs = date - now;
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 0) return "Resolved";
  if (diffMins < 1) return "Now";
  if (diffMins < 60) return `In ${diffMins} min`;
  if (diffHours < 24) return `In ${diffHours}h`;
  if (diffDays === 0) return `Today ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return `Tomorrow ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  
  return date.toLocaleDateString();
}

export default {
  fetchMarkets,
  fetchMarket,
  fetchOrderBook,
  filterMarkets,
  getTodayMarkets,
  inferCategory,
  formatMarketForAnalysis,
  formatResolveTime,
};
