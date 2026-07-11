// packages/shared/openai-client.js
// OpenAI API client for market analysis

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Analyze a market using OpenAI
 * Returns probability estimate and reasoning
 */
export async function analyzeMarket(market, currentMarketOdds) {
  const prompt = `You are a prediction market analyst. Analyze this betting market and estimate the probability of the YES outcome.

Market Question: ${market.question}
Category: ${market.category}
Current Market Odds (YES): ${Math.round(currentMarketOdds * 100)}%
Resolves: ${market.resolves}

Based on current information, recent news, and market context, what is your estimated probability that this resolves YES?

Respond in JSON format only:
{
  "probability": 0.65,
  "confidence": 0.85,
  "reasoning": "Brief explanation of your estimate"
}

The probability should be a decimal between 0 and 1.
Confidence should reflect how certain you are (0-1 scale).`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or use "gpt-3.5-turbo" for cheaper option
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const content = response.choices[0].message.content;
    
    // Extract JSON from response (may have extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in OpenAI response");
    }

    const result = JSON.parse(jsonMatch[0]);
    
    return {
      aiProbability: Math.max(0, Math.min(1, result.probability)), // Clamp 0-1
      confidence: Math.max(0, Math.min(1, result.confidence)), // Clamp 0-1
      reasoning: result.reasoning || "No reasoning provided",
    };
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    throw error;
  }
}

/**
 * Batch analyze multiple markets
 */
export async function analyzeMarkets(markets) {
  const results = [];
  
  for (const market of markets) {
    try {
      const analysis = await analyzeMarket(market, market.currentOdds);
      results.push({
        marketId: market.id,
        ...analysis,
      });
      
      // Rate limiting: add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Failed to analyze market ${market.id}:`, error);
      results.push({
        marketId: market.id,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Generate a reasoning summary for Discord embed
 */
export async function generateEmbedSummary(market, aiAnalysis) {
  const prompt = `Summarize this market analysis in 2-3 sentences for a betting Discord embed. Be direct and actionable.

Question: ${market.question}
Market Odds (YES): ${Math.round(market.currentOdds * 100)}%
AI Estimate: ${Math.round(aiAnalysis.aiProbability * 100)}%
Reasoning: ${aiAnalysis.reasoning}

Provide only the summary, no JSON.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 150,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Failed to generate summary:", error);
    return aiAnalysis.reasoning;
  }
}

export default openai;
