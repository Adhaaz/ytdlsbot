const { Telegraf, Markup } = require('telegraf');
const ytdl = require('ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');

const bot = new Telegraf(config.BOT_TOKEN);

require('./bot')(bot);

bot.start((ctx) => ctx.reply('Selamat datang! Gunakan perintah /ytdl untuk mengunduh video atau audio dari YouTube.'));

const PORT = process.env.PORT || 3000;
bot.launch();
console.log(`Server is running on port ${PORT}`);