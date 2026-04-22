require('dotenv').config({ path: '.env' });
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { initDatabase, query, execute, sql } = require('./db');
const {
    logWithTimestamp,
    addServerIfNotExistByMessage,
    addChannelIfNotExistByMessage,
    addMemberIfNotExistByMessage,
    addReaction,
    deleteReaction,
    addMessage,
    editMessage,
    deleteMessage,
    initialAddingOfAll,
    initialAddingOfOne,
    deleteServerDataPermanently,
} = require('./functions');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

client.once('clientReady', async () => {
    logWithTimestamp(`✓ Bot logged in as ${client.user.tag}`);

    try {
        await initialAddingOfAll(client.guilds.cache);

        setInterval(async () => {
            try {
                await initialAddingOfAll(client.guilds.cache);
            } catch (err) {
                console.error('DB seed error:', err.message);
            }
        }, 15 * 60 * 1000);
    } catch (err) {
        console.error('DB seed error:', err.message);
    }
});

client.on('guildCreate', async (guild) => {
    logWithTimestamp(`Joined new server: ${guild.name} (ID: ${guild.id})`);

    try {
        await initialAddingOfOne(guild);
    } catch (err) {
        console.error('DB seed error:', err.message);
    }
});

client.on('guildDelete', async (guild) => {
    logWithTimestamp(`Left server: ${guild.name} (ID: ${guild.id})`);

    try {
        await deleteServerDataPermanently(guild.id);
        logWithTimestamp(`Purged server data for ${guild.id}`);
    } catch (err) {
        console.error('DB purge error:', err.message);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = (message.content || '').replace(/\s+/g, ' ').trim();

    if (content === '!dbtest') {
        const rows = await query('SELECT 1 AS ok');
        await message.reply(`DB test: ${rows[0]?.ok === 1 ? 'ok' : 'unexpected result'}`);
    }

    logWithTimestamp(`[CREATE] [${message?.id || 'unknown'}] [${message?.author?.id || 'unknown'}] [${message?.content || ''}]`);

    // console.log(message);

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
    const editedContent = newMessage.content || oldMessage.content || '';
    logWithTimestamp(`[EDIT] [${newMessage?.id || oldMessage?.id || 'unknown'}] [${newMessage?.author?.id || oldMessage?.author?.id || 'unknown'}] [${editedContent}]`);

    try {
        await addServerIfNotExistByMessage(newMessage);
        await addChannelIfNotExistByMessage(newMessage);
        await addMemberIfNotExistByMessage(newMessage);
        await editMessage(newMessage, oldMessage.id);
    } catch (err) {
        console.error('DB error:', err.message);
    }
});

client.on('messageDelete', async (message) => {
    logWithTimestamp(`[DELETE] [${message?.id || 'unknown'}] [${message?.author?.id || 'unknown'}] [${message?.content || ''}]`);

    try {
        await addServerIfNotExistByMessage(message);
        await addChannelIfNotExistByMessage(message);
        await addMemberIfNotExistByMessage(message);
        await deleteMessage(message.id);
    } catch (err) {
        console.error('DB error:', err.message);
    }
});

client.on('messageReactionAdd', async (reaction, user) => {
    if (user?.bot) return;

    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message?.partial) await reaction.message.fetch();

        const message = reaction.message;
        if (!message?.guildId) return;

        logWithTimestamp(`[REACTION_ADD] [${message?.id || 'unknown'}] [${user?.id || 'unknown'}] [${reaction?.emoji?.toString() || ''}]`);

        await addServerIfNotExistByMessage(message);
        await addChannelIfNotExistByMessage(message);
        await addMemberIfNotExistByMessage({
            author: user,
            guildId: message.guildId,
            guild: message.guild,
        });
        await addReaction(reaction, user);
    } catch (err) {
        console.error('Reaction add error:', err.message);
    }
});

client.on('messageReactionRemove', async (reaction, user) => {
    if (user?.bot) return;

    try {
        if (reaction.partial) await reaction.fetch();
        if (reaction.message?.partial) await reaction.message.fetch();

        const message = reaction.message;
        if (!message?.guildId) return;

        logWithTimestamp(`[REACTION_REMOVE] [${message?.id || 'unknown'}] [${user?.id || 'unknown'}] [${reaction?.emoji?.toString() || ''}]`);

        await addServerIfNotExistByMessage(message);
        await addChannelIfNotExistByMessage(message);
        await addMemberIfNotExistByMessage({
            author: user,
            guildId: message.guildId,
            guild: message.guild,
        });
        await deleteReaction(reaction, user);
    } catch (err) {
        console.error('Reaction remove error:', err.message);
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