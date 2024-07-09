



const express = require('express');
const { Telegraf, Markup } = require('telegraf');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

const app = express();
const bot = new Telegraf(config.BOT_TOKEN);


require('./bot')(bot);

bot.start((ctx) => ctx.reply('Selamat datang! Gunakan perintah /ytdl untuk mengunduh video atau audio dari YouTube.'));

bot.telegram.setWebhook(`${config.URL}/bot${config.BOT_TOKEN}`);
app.use(bot.webhookCallback(`/bot${config.BOT_TOKEN}`));

app.get('/', (req, res) => {
    res.send('Daflixx Bot is running!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
