// apps/bot/index.js
// Main Discord bot entry point

import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import dotenv from "dotenv";
import { db } from "../shared/supabase-client.js";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const VERCEL_API_URL = process.env.VERCEL_API_URL || "http://localhost:3000";

// Bot ready
client.on("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
  client.user.setActivity("/scan for signals", { type: "WATCHING" });
});

// Handle interactions (slash commands, buttons)
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, user } = interaction;

  try {
    switch (commandName) {
      case "scan":
        await handleScanCommand(interaction);
        break;
      case "config":
        await handleConfigCommand(interaction);
        break;
      case "leaderboard":
        await handleLeaderboardCommand(interaction);
        break;
      default:
        await interaction.reply("Unknown command");
    }
  } catch (error) {
    console.error(`Error handling ${commandName}:`, error);
    await interaction.reply({
      content: `❌ Error: ${error.message}`,
      ephemeral: true,
    });
  }
});

/**
 * /scan command - Run AI analysis and post signals to channel
 */
async function handleScanCommand(interaction) {
  await interaction.deferReply();

  try {
    console.log("Running scan command...");

    // Call the Vercel API to run analysis
    const scanResponse = await fetch(`${VERCEL_API_URL}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: 20,
        categories: [],
      }),
    });

    const scanData = await scanResponse.json();

    if (!scanData.success) {
      return await interaction.editReply({
        content: `❌ Scan failed: ${scanData.error}`,
      });
    }

    if (scanData.signals.length === 0) {
      return await interaction.editReply({
        content: `📊 Scan complete. No signals found with your criteria.`,
      });
    }

    // Get user config
    const userConfig = await db.getUserConfig(interaction.user.id);
    const minEdge = (userConfig?.min_edge || 0.15) * 100;
    const minConfidence = (userConfig?.min_confidence || 0.65) * 100;

    // Filter signals by user's criteria
    const userSignals = scanData.signals.filter(
      (signal) =>
        signal.edge >= minEdge && signal.analysis.confidence * 100 >= minConfidence
    );

    if (userSignals.length === 0) {
      return await interaction.editReply({
        content: `📊 Scan found ${scanData.signals.length} signals, but none met your criteria (${minEdge}pt edge, ${minConfidence}% sense).`,
      });
    }

    // Get channel to post alerts
    const channelId = userConfig?.alert_channel_id || process.env.DISCORD_CHANNEL_ID;
    const channel = await interaction.client.channels.fetch(channelId);

    if (!channel || channel.type !== ChannelType.GuildText) {
      return await interaction.editReply({
        content: `❌ Alert channel not found or not a text channel`,
      });
    }

    // Post signals to channel
    for (const signal of userSignals) {
      const embed = buildSignalEmbed(signal, userConfig);
      const msg = await channel.send({ embeds: [embed] });

      // Log alert in database
      try {
        await db.logAlertSent(signal.prediction.id, msg.id, channelId);
      } catch (dbErr) {
        console.warn("Failed to log alert:", dbErr);
      }
    }

    await interaction.editReply({
      content: `✅ Scan complete! Found ${userSignals.length} signal${userSignals.length !== 1 ? "s" : ""} and posted to <#${channelId}>`,
    });
  } catch (error) {
    console.error("Scan command error:", error);
    await interaction.editReply({
      content: `❌ Error: ${error.message}`,
    });
  }
}

/**
 * /config command - Show/update user settings
 */
async function handleConfigCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "show") {
    const config = await db.getUserConfig(interaction.user.id);
    const userConfig = config || {
      discord_user_id: interaction.user.id,
      min_edge: 0.15,
      min_confidence: 0.65,
      bankroll: 1000,
      kelly_fraction: 0.35,
    };

    const embed = {
      title: "⚙️ Your Alert Settings",
      color: 0x6366f1,
      fields: [
        { name: "Minimum Edge", value: `${Math.round(userConfig.min_edge * 100)}pt`, inline: true },
        { name: "Minimum Sense", value: `${Math.round(userConfig.min_confidence * 100)}%`, inline: true },
        { name: "Bankroll", value: `$${userConfig.bankroll}`, inline: true },
        { name: "Kelly Fraction", value: `${userConfig.kelly_fraction}x`, inline: true },
        { name: "Alert Channel", value: userConfig.alert_channel_id ? `<#${userConfig.alert_channel_id}>` : "Not set", inline: true },
      ],
      footer: { text: "Use /config update to change settings" },
    };

    return await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (subcommand === "update") {
    const minEdge = interaction.options.getNumber("min-edge");
    const minConfidence = interaction.options.getNumber("min-confidence");
    const bankroll = interaction.options.getInteger("bankroll");
    const kellyFraction = interaction.options.getNumber("kelly-fraction");

    const updates = {
      min_edge: minEdge,
      min_confidence: minConfidence,
      bankroll: bankroll,
      kelly_fraction: kellyFraction,
    };

    // Remove undefined values
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    await db.updateUserConfig(interaction.user.id, updates);

    await interaction.reply({
      content: "✅ Settings updated!",
      ephemeral: true,
    });
  }
}

/**
 * /leaderboard command - Show calibration stats
 */
async function handleLeaderboardCommand(interaction) {
  await interaction.deferReply({ ephemeral: false });

  try {
    const leaderboardResponse = await fetch(`${VERCEL_API_URL}/api/leaderboard?limit=10`);
    const leaderboardData = await leaderboardResponse.json();

    if (!leaderboardData.success) {
      return await interaction.editReply("❌ Failed to fetch leaderboard");
    }

    const { summary, stats } = leaderboardData;

    if (summary.total_predictions === 0) {
      return await interaction.editReply("📊 No calibration data yet. Run some scans first!");
    }

    // Build leaderboard embed
    const embed = {
      title: "📊 AI Calibration Stats",
      color: 0x22c55e,
      fields: [
        { name: "Total Predictions", value: summary.total_predictions.toString(), inline: true },
        { name: "Resolved", value: summary.resolved_predictions.toString(), inline: true },
        { name: "Accuracy", value: `${summary.accuracy}%`, inline: true },
        { name: "Avg Confidence", value: `${summary.average_confidence}%`, inline: true },
        { name: "Avg Error", value: `${summary.average_error}%`, inline: true },
      ],
      footer: { text: "How well is the AI really doing?" },
    };

    if (stats.length > 0) {
      const recentStats = stats.slice(0, 5).map((s) => {
        const result = s.wasCorrect === null ? "⏳" : s.wasCorrect === 1 ? "✅" : "❌";
        return `${result} ${s.question.substring(0, 40)}... (${Math.round(s.confidence * 100)}%)`;
      });

      embed.fields.push({
        name: "Recent Predictions",
        value: recentStats.join("\n") || "None",
      });
    }

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error("Leaderboard error:", error);
    await interaction.editReply(`❌ Error: ${error.message}`);
  }
}

/**
 * Build Discord embed for a market signal
 */
function buildSignalEmbed(signal, userConfig) {
  const { market, analysis, edge } = signal;
  const call = analysis.aiProbability >= 0.5 ? "YES" : "NO";
  const color = call === "YES" ? 0x22c55e : 0xef4444;

  const bet = calculateKellyBet(
    analysis.aiProbability,
    market.currentOdds,
    userConfig?.bankroll || 1000,
    userConfig?.kelly_fraction || 0.35
  );

  return {
    title: `⚡ BET ${call}`,
    description: market.question,
    color,
    fields: [
      {
        name: "Market",
        value: `${Math.round(market.currentOdds * 100)}%`,
        inline: true,
      },
      {
        name: "AI Estimate",
        value: `${Math.round(analysis.aiProbability * 100)}%`,
        inline: true,
      },
      {
        name: "Edge",
        value: `${edge}pt`,
        inline: true,
      },
      {
        name: "Sense",
        value: `${Math.round(analysis.confidence * 100)}%`,
        inline: true,
      },
      {
        name: "Suggested Bet (Kelly ${userConfig?.kelly_fraction || 0.35}x)",
        value: `$${bet}`,
        inline: true,
      },
      {
        name: "Category",
        value: market.category,
        inline: true,
      },
      {
        name: "Reasoning",
        value: analysis.reasoning,
      },
    ],
    footer: {
      text: `Resolves ${market.resolves} • ${edge}pt edge`,
    },
    timestamp: new Date(),
  };
}

/**
 * Calculate Kelly-sized bet
 */
function calculateKellyBet(aiProb, marketProb, bankroll, fraction) {
  const edge = aiProb - marketProb;
  if (edge <= 0) return 0;

  const k = edge / (1 - marketProb);
  return Math.max(0, Math.round(bankroll * k * fraction));
}

// Login
client.login(DISCORD_TOKEN);
