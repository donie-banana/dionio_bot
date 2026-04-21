require('dotenv').config({ path: '.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const { initDatabase, query, execute, sql } = require('./db');
const {
    addServerIfNotExistByMessage,
    addChannelIfNotExistByMessage,
    addMemberIfNotExistByMessage,
    addMessage,
    editMessage,
} = require('./functions');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

client.once('clientReady', () => {
    console.log(`✓ Bot logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = (message.content || '').replace(/\s+/g, ' ').trim();

    if (content === '!dbtest') {
        const rows = await query('SELECT 1 AS ok');
        await message.reply(`DB test: ${rows[0]?.ok === 1 ? 'ok' : 'unexpected result'}`);
    }

    console.log(message);

    try {
        await addServerIfNotExistByMessage(message);
        await addChannelIfNotExistByMessage(message);
        await addMemberIfNotExistByMessage(message);
        await addMessage(message);
    } catch (err) {
        console.error('DB error:', err.message);
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    console.log('[EDIT]', {
        oldId: oldMessage.id,
        newId: newMessage.id,
        authorId: newMessage.author?.id || oldMessage.author?.id,
        channelId: newMessage.channelId || oldMessage.channelId,
        before: oldMessage.content,
        after: newMessage.content,
        editedAt: newMessage.editedAt?.toISOString() || null,
    });

    try {
        await addServerIfNotExistByMessage(newMessage);
        await addChannelIfNotExistByMessage(newMessage);
        await addMemberIfNotExistByMessage(newMessage);
        await editMessage(newMessage, oldMessage.id);
    } catch (err) {
        console.error('DB error:', err.message);
    }
});

client.on('messageDelete', (message) => {
    console.log('[DELETE]', {
        id: message.id,
        authorId: message.author?.id || null,
        channelId: message.channelId,
        content: message.content || null,
        deletedAt: new Date().toISOString(),
    });

    try {
        await addServerIfNotExistByMessage(newMessage);
        await addChannelIfNotExistByMessage(newMessage);
        await addMemberIfNotExistByMessage(newMessage);
        await deleteMessage(nmessage);
    } catch (err) {
        console.error('DB error:', err.message);
    }
});

const start = async () => {
    await initDatabase();
    await client.login(process.env.TOKEN);
};

start().catch((error) => {
    console.error('Startup failed:', error.message);
    process.exit(1);
});