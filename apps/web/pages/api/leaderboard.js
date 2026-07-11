// apps/web/pages/api/leaderboard.js
// GET /api/leaderboard - AI calibration and accuracy stats

import { db } from "packages/shared/supabase-client.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { limit = 100 } = req.query;

    // Get calibration stats
    const stats = await db.getCalibrationStats(parseInt(limit));

    if (!stats || stats.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No calibration data yet",
        stats: [],
        summary: {
          total_predictions: 0,
          correct_predictions: 0,
          accuracy: 0,
          average_confidence: 0,
          average_error: 0,
        },
      });
    }

    // Calculate summary stats
    const resolved = stats.filter((s) => s.was_correct !== null);
    const correct = resolved.filter((s) => s.was_correct === 1).length;
    const accuracy = resolved.length > 0 ? correct / resolved.length : 0;
    const avgConfidence = stats.reduce((sum, s) => sum + (s.confidence || 0), 0) / stats.length;
    const avgError = resolved.reduce((sum, s) => sum + (s.error || 0), 0) / resolved.length || 0;

    return res.status(200).json({
      success: true,
      stats: stats.map((s) => ({
        id: s.id,
        question: s.question,
        category: s.category,
        aiProbability: s.ai_probability,
        confidence: s.confidence,
        wasCorrect: s.was_correct,
        error: s.error,
        createdAt: s.created_at,
        resolvedAt: s.resolved_at,
      })),
      summary: {
        total_predictions: stats.length,
        resolved_predictions: resolved.length,
        correct_predictions: correct,
        accuracy: Math.round(accuracy * 10000) / 100, // percentage
        average_confidence: Math.round(avgConfidence * 10000) / 100,
        average_error: Math.round(avgError * 10000) / 100,
      },
    });
  } catch (error) {
    console.error("Leaderboard endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
