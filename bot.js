

const { Telegraf, Markup } = require('telegraf');
const ytdl = require('ytdl-core');
const streamBuffers = require('stream-buffers');

const activeSessions = {};
const ITEMS_PER_PAGE = 5;
const MAX_FILE_SIZE_MB = 500;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

module.exports = (bot) => {
    const commands = [
        {
            command: 'ytdl',
            handler: async (ctx) => {
                const userId = ctx.from.id;
                const groupId = ctx.chat.id;

                if (activeSessions[groupId]) {
                    const session = activeSessions[groupId];
                    if (session.userId === userId) {
                        await ctx.reply(`Anda sudah dalam sesi aktif.`);
                        return;
                    } else {
                        await ctx.reply(`Hei @${ctx.from.username}, kamu tidak dapat mengakses fitur ini saat ini, karena user @${session.username} telah terlebih dahulu mengirimkan command. Silakan tunggu sampai proses pengunduhan selesai.`);
                        return;
                    }
                }

                activeSessions[groupId] = { userId, username: ctx.from.username };

                activeSessions[groupId].timeout = setTimeout(async () => {
                    const session = activeSessions[groupId];
                    if (session && session.userId === userId) {
                        await ctx.reply(`Hei @${ctx.from.username}, Anda tidak memberikan link video YouTube untuk diunduh!`);
                        delete activeSessions[groupId];
                    }
                }, 30000);

                await ctx.reply('Pilih tipe unduhan:', Markup.inlineKeyboard([
                    [Markup.button.callback('Video', 'download_video')],
                    [Markup.button.callback('Audio', 'download_audio')]
                ]));
            }
        },
        {
         command: 'start',
            handler: async (ctx) => {
             ctx.reply("Selamat datang! Gunakan perintah /ytdl untuk mengunduh video atau audio dari YouTube");
          }
      }
    ];

    commands.forEach(cmd => {
        bot.command(cmd.command, cmd.handler);
    });

    bot.action('download_video', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        session.downloadType = 'video';
        await ctx.editMessageText('Kirimkan tautan video YouTube yang ingin diunduh:');
    });

    bot.action('download_audio', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        session.downloadType = 'audio';
        await ctx.editMessageText('Kirimkan tautan video YouTube yang ingin diunduh:');
    });

    bot.on('text', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        const url = ctx.message.text;
        session.url = url; // Save the URL in the session

        if (!session.downloadType) {
            await ctx.reply('Harap pilih tipe unduhan (Video atau Audio) terlebih dahulu!');
            return;
        }

        clearTimeout(session.timeout);

        const downloadType = session.downloadType;

        delete session.downloadType;

        try {
            const videoInfo = await ytdl.getInfo(url);
            const title = videoInfo.videoDetails.title;
            const sanitizedTitle = title.replace(/[\/\?\\:\*\|\":"]/g, '_');

            // Cek ukuran file
            const formats = videoInfo.formats;
            const totalSize = formats.reduce((acc, format) => acc + (parseInt(format.contentLength) || 0), 0);

            if (totalSize > MAX_FILE_SIZE_BYTES) {
                await ctx.reply(`Ukuran file melebihi batas ${MAX_FILE_SIZE_MB}MB. Tidak dapat mengunduh.`);
                delete activeSessions[groupId];
                return;
            }

            if (downloadType === 'video') {
                const videoFormats = formats.filter(format => format.hasVideo && format.qualityLabel);
                if (videoFormats.length === 0) {
                    await ctx.reply('Tidak ada format video yang tersedia untuk unduhan.');
                    return;
                }

                // Remove duplicate resolutions
                const uniqueVideoFormats = Array.from(new Map(videoFormats.map(format => [format.qualityLabel, format])).values());

                activeSessions[groupId].availableFormats = uniqueVideoFormats;
                activeSessions[groupId].currentPage = 0;

                await sendPage(ctx, groupId, 'video');
            } else if (downloadType === 'audio') {
                const audioFormats = formats.filter(format => format.hasAudio && !format.hasVideo);
                if (audioFormats.length === 0) {
                    await ctx.reply('Tidak ada format audio yang tersedia untuk unduhan.');
                    return;
                }

                // Remove duplicate audio qualities
                const uniqueAudioFormats = Array.from(new Map(audioFormats.map(format => [format.audioQuality, format])).values());

                activeSessions[groupId].availableFormats = uniqueAudioFormats;
                activeSessions[groupId].currentPage = 0;

                await sendPage(ctx, groupId, 'audio');
            }
        } catch (error) {
            await ctx.reply('Terjadi kesalahan saat mengunduh. Silakan coba lagi.');
            console.error(error);
            delete activeSessions[groupId];
        }
    });

    async function sendPage(ctx, groupId, type) {
        const session = activeSessions[groupId];
        const formats = session.availableFormats;
        const page = session.currentPage;
        
        const start = page * ITEMS_PER_PAGE;
        const end = start + ITEMS_PER_PAGE;
        const items = formats.slice(start, end);

        const buttons = items.map(format => {
            const label = type === 'video' ? format.qualityLabel : (format.audioQuality || 'Unknown Quality');
            const action = type === 'video' ? `resolution_${format.itag}` : `quality_${format.itag}`;
            return [Markup.button.callback(label, action)];
        });

        const navigationButtons = [];
        if (formats.length > ITEMS_PER_PAGE) {
            if (page > 0) {
                navigationButtons.push(Markup.button.callback('Previous Page', 'prev_page'));
            }
            if (end < formats.length) {
                navigationButtons.push(Markup.button.callback('Next Page', 'next_page'));
            }
            navigationButtons.push(Markup.button.callback('Back', 'back_page'));
        }

        await ctx.reply(`Pilih ${type === 'video' ? 'resolusi video' : 'kualitas audio'}:`, Markup.inlineKeyboard([...buttons, navigationButtons]));
    }

    bot.action(/resolution_.+/, async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        const itag = ctx.callbackQuery.data.split('_')[1];
        const format = session.availableFormats.find(format => format.itag == itag);

        if (!format) {
            await ctx.reply('Resolusi yang dipilih tidak tersedia.');
            return;
        }

        const videoStream = ytdl(session.url, { format });
        const bufferStream = new streamBuffers.WritableStreamBuffer();

        videoStream.pipe(bufferStream);

        videoStream.on('end', async () => {
            await ctx.replyWithVideo({ source: bufferStream.getContents() });
            delete activeSessions[groupId];
        });

        await ctx.editMessageText(`Mengunduh video dengan resolusi: ${format.qualityLabel}`);
    });

    bot.action(/quality_.+/, async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        const itag = ctx.callbackQuery.data.split('_')[1];
        const format = session.availableFormats.find(format => format.itag == itag);

        if (!format) {
            await ctx.reply('Kualitas audio yang dipilih tidak tersedia.');
            return;
        }

        const audioStream = ytdl(session.url, { format });
        const bufferStream = new streamBuffers.WritableStreamBuffer();

        audioStream.pipe(bufferStream);

        audioStream.on('end', async () => {
            await ctx.replyWithAudio({ source: bufferStream.getContents() });
            delete activeSessions[groupId];
        });

        await ctx.editMessageText(`Mengunduh audio dengan kualitas: ${format.audioQuality || 'Unknown Quality'}`);
    });

    bot.action('prev_page', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        if (session.currentPage > 0) {
            session.currentPage -= 1;
            await sendPage(ctx, groupId, session.downloadType === 'video' ? 'video' : 'audio');
        }
    });

    bot.action('next_page', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        if ((session.currentPage + 1) * ITEMS_PER_PAGE < session.availableFormats.length) {
            session.currentPage += 1;
            await sendPage(ctx, groupId, session.downloadType === 'video' ? 'video' : 'audio');
        }
    });

    bot.action('back_page', async (ctx) => {
        const groupId = ctx.chat.id;
        const userId = ctx.from.id;

        const session = activeSessions[groupId];
        if (!session || session.userId !== userId) return;

        delete session.availableFormats;
        delete session.currentPage;

        await ctx.reply('Pilih tipe unduhan:', Markup.inlineKeyboard([
            [Markup.button.callback('Video', 'download_video')],
            [Markup.button.callback('Audio', 'download_audio')]
        ]));
    });
};

