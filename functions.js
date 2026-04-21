const { initDatabase, query, execute, sql } = require('./db');

async function addServerIfNotExistByMessage(message) {
    const serverCheck = await query(
        'SELECT * FROM servers WHERE (id = ?)',
        [message.guildId]
    );

    if (serverCheck.length == 0) {
        await execute(
            'INSERT INTO servers (id, server_name, owner_id, created_at, joined_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [message.guildId, message.guild.name, message.guild.ownerId, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), true]
        );
    }
}

async function addChannelIfNotExistByMessage(message) {
    const channelCheck = await query(
        'SELECT * FROM channels WHERE (id = ?)',
        [message.channelId]
    );

    if (channelCheck.length == 0) {
        await execute(
            'INSERT INTO channels (id, server_id, name, channel_type, description, position, total_messages, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [message.channelId, message.guildId, message.channel.name || 'unknown', message.channel.type || 'text', message.channel.topic || null, message.channel.position || 0, 0, true, new Date().toISOString(), new Date().toISOString()]
        );
    }
}

async function addMemberIfNotExistByMessage(message) {
    const memberCheck = await query(
        'SELECT * FROM members WHERE (id = ?) AND (server_id = ?)',
        [message.author.id, message.guildId]
    );

    if (memberCheck.length == 0) {
        await execute(
            'INSERT INTO members (id, server_id, username, display_name, global_name, avatar_url, bot, created_at, updated_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [message.author.id, message.guildId, message.author.username, message.author.displayName || null, message.author.globalName || null, message.author.displayAvatarURL() || null, message.author.bot, new Date().toISOString(), new Date().toISOString(), new Date().toISOString()]
        );
    }
}

async function addMessage(message) {
    await execute(
        'INSERT INTO messages (id, channel_id, user_id, content, is_edited, created_at, reply_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [message.id, message.channelId, message.author.id, message.content || '', false, message.createdAt?.toISOString() || new Date().toISOString(), message.reference?.messageId || null]
    );
}

async function editMessage(message) {
    const messageEditCheck = await query(
        'SELECT * FROM messages WHERE (og_id = ?)',
        [message.id]
    );

    if (messageEditCheck == undefined) {
        messageEditCheck = 0;
    }

    await execute(
        'INSERT INTO messages (id, channel_id, user_id, og_id, content, is_edited, created_at, reply_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [`${messageEditCheck.length + 1}-${message.id}`, message.channelId, message.author.id, message.id, message.content || '', true, message.createdAt?.toISOString() || new Date().toISOString(), message.reference?.messageId || null]
    );
}

async function deleteMessage() {
    
}

module.exports = {
    addServerIfNotExistByMessage,
    addChannelIfNotExistByMessage,
    addMemberIfNotExistByMessage,
    addMessage,
    editMessage,
};
