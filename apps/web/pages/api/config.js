// apps/web/pages/api/config.js
// GET/POST /api/config - User configuration settings

import { db } from "packages/shared/supabase-client.js";
import { DEFAULT_USER_CONFIG } from "packages/shared/constants.js";

export default async function handler(req, res) {
  try {
    const { discordUserId } = req.query;

    // GET - Fetch user config
    if (req.method === "GET") {
      if (!discordUserId) {
        return res.status(400).json({ error: "discordUserId required" });
      }

      const config = await db.getUserConfig(discordUserId);
      
      // Return default config if user has none
      const userConfig = config || {
        discord_user_id: discordUserId,
        ...DEFAULT_USER_CONFIG,
      };

      return res.status(200).json({
        success: true,
        config: userConfig,
      });
    }

    // POST - Update user config
    if (req.method === "POST") {
      if (!discordUserId) {
        return res.status(400).json({ error: "discordUserId required" });
      }

      const { min_edge, min_confidence, bankroll, kelly_fraction, alert_channel_id } = req.body;

      // Validate inputs
      if (min_edge !== undefined && (min_edge < 0 || min_edge > 1)) {
        return res.status(400).json({ error: "min_edge must be between 0 and 1" });
      }
      if (min_confidence !== undefined && (min_confidence < 0 || min_confidence > 1)) {
        return res.status(400).json({ error: "min_confidence must be between 0 and 1" });
      }
      if (bankroll !== undefined && bankroll < 0) {
        return res.status(400).json({ error: "bankroll must be >= 0" });
      }
      if (kelly_fraction !== undefined && (kelly_fraction < 0.1 || kelly_fraction > 1)) {
        return res.status(400).json({ error: "kelly_fraction must be between 0.1 and 1" });
      }

      const config = await db.updateUserConfig(discordUserId, {
        min_edge: min_edge ?? undefined,
        min_confidence: min_confidence ?? undefined,
        bankroll: bankroll ?? undefined,
        kelly_fraction: kelly_fraction ?? undefined,
        alert_channel_id: alert_channel_id ?? undefined,
      });

      return res.status(200).json({
        success: true,
        config: config[0],
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Config endpoint error:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
