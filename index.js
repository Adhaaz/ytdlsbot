const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

const app = express();
const PORT = process.env.PORT || 3000;
const bot = new Telegraf(config.BOT_TOKEN);

require('./bot')(bot);

bot.start((ctx) => ctx.reply('Selamat datang! Gunakan perintah /ytdl untuk mengunduh video atau audio dari YouTube.'));

const PORT = process.env.PORT || 3000;
app.use(bot.webhookCallback('/secret-path'));
   bot.telegram.setWebhook(`https://female-crowd.surge.sh/secret-path`);

   app.get('/', (req, res) => {
     res.send('This is a Telegram bot server.');
   });

   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   
bot.launch();
console.log(`Server is running on port ${PORT}`);
