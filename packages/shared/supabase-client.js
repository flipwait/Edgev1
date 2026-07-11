// packages/shared/supabase-client.js
// Initialize Supabase client for both web and bot

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Prediction queries
export const db = {
  // Fetch a market by Polymarket ID
  async getMarket(polymarketId) {
    const { data, error } = await supabase
      .from("markets")
      .select("*")
      .eq("polymarket_id", polymarketId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Create or update a market
  async upsertMarket(market) {
    const { data, error } = await supabase
      .from("markets")
      .upsert(market, { onConflict: "polymarket_id" });
    
    if (error) throw error;
    return data;
  },

  // Insert a prediction
  async insertPrediction(prediction) {
    const { data, error } = await supabase
      .from("predictions")
      .insert(prediction);
    
    if (error) throw error;
    return data;
  },

  // Get predictions for a market
  async getPredictionsForMarket(marketId) {
    const { data, error } = await supabase
      .from("predictions")
      .select("*")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Log an alert sent to Discord
  async logAlertSent(predictionId, discordMessageId, channelId) {
    const { data, error } = await supabase
      .from("alerts_sent")
      .insert({
        prediction_id: predictionId,
        discord_message_id: discordMessageId,
        discord_channel_id: channelId,
      });
    
    if (error) throw error;
    return data;
  },

  // Get user config
  async getUserConfig(discordUserId) {
    const { data, error } = await supabase
      .from("user_configs")
      .select("*")
      .eq("discord_user_id", discordUserId)
      .single();
    
    if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
    return data;
  },

  // Update user config
  async updateUserConfig(discordUserId, config) {
    const { data, error } = await supabase
      .from("user_configs")
      .upsert({
        discord_user_id: discordUserId,
        ...config,
      });
    
    if (error) throw error;
    return data;
  },

  // Get calibration stats (accuracy of predictions)
  async getCalibrationStats(limit = 50) {
    const { data, error } = await supabase
      .from("prediction_accuracy")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data;
  },

  // Record an outcome (when market resolves)
  async recordOutcome(marketId, resolvedValue) {
    const { data, error } = await supabase
      .from("outcomes")
      .upsert({
        market_id: marketId,
        resolved_value: resolvedValue,
        resolved_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    return data;
  },
};

export default supabase;
