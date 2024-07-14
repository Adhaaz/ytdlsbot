
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;

// Memulai bot Telegraf
const bot = new Telegraf(config.BOT_TOKEN);
require('./bot')(bot);

// Memulai server Express setelah bot dimulai
bot.launch().then(() => {
  console.log(`Bot running on ${config.BOT_TOKEN}`);

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
