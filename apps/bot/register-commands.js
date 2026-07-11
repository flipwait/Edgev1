// apps/bot/register-commands.js
// Register slash commands with Discord
// Run this once: node register-commands.js

import { REST, Routes } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const commands = [
  {
    name: "scan",
    description: "Scan markets for trading signals and post to channel",
  },
  {
    name: "config",
    description: "Manage your alert settings",
    options: [
      {
        name: "show",
        description: "Show your current settings",
        type: 1, // SUBCOMMAND
      },
      {
        name: "update",
        description: "Update your settings",
        type: 1, // SUBCOMMAND
        options: [
          {
            name: "min-edge",
            description: "Minimum edge threshold (0.0-1.0)",
            type: 10, // NUMBER
            required: false,
          },
          {
            name: "min-confidence",
            description: "Minimum confidence/sense score (0.0-1.0)",
            type: 10, // NUMBER
            required: false,
          },
          {
            name: "bankroll",
            description: "Betting bankroll in dollars",
            type: 4, // INTEGER
            required: false,
          },
          {
            name: "kelly-fraction",
            description: "Kelly fraction for bet sizing (0.1-1.0)",
            type: 10, // NUMBER
            required: false,
          },
        ],
      },
    ],
  },
  {
    name: "leaderboard",
    description: "Show AI calibration and prediction accuracy stats",
  },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log("Registering slash commands...");

    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), {
      body: commands,
    });

    console.log("✅ Slash commands registered successfully!");
  } catch (error) {
    console.error("Failed to register commands:", error);
    process.exit(1);
  }
}

registerCommands();
