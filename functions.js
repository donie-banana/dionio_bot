const { initDatabase, query, execute, sql } = require('./db');

function logWithTimestamp(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

async function initialAddingOfAll(guilds) {
    logWithTimestamp('starting "adding of all"');
    for (const guild of guilds.values()) {
        await initialAddingOfOne(guild);
    }
}

async function initialAddingOfOne(guild) {
    const serverMessage = `${guild.id}: ${guild.name}`;
    logWithTimestamp(`checking server ${serverMessage}`);
    await addServerifNotExist(guild.id, guild.name, guild.ownerId, guild.iconURL() || null, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), true);

    logWithTimestamp(`checking all channels on server ${serverMessage}`);
    for (const channel of guild.channels.cache.values()) {
        logWithTimestamp(`channel ${channel.id}: ${channel.name}`);
        await addChannelIfNotExist(channel.id, guild.id, channel.name || 'unknown', channel.type || 'text', channel.topic || null, channel.position || 0, 0, null, true, new Date().toISOString(), new Date().toISOString());
    }

    logWithTimestamp(`checking all roles on server ${serverMessage}`);
    for (const role of guild.roles.cache.values()) {
        logWithTimestamp(`role ${role.id}: ${role.name}`);
        await addRoleIfNotExist(role.id, guild.id, role.name, role.hexColor || null, role.position || 0, role.permissions?.bitfield?.toString() || null, new Date().toISOString(), new Date().toISOString());
    }

    logWithTimestamp(`checking all members on server ${serverMessage}`);
    for (const member of guild.members.cache.values()) {
        logWithTimestamp(`member ${member.id}: ${member.user.username}`);
        await addMemberIfNotExist(member.id, member.user.username, member.displayName || null, member.user.globalName || null, member.user.displayAvatarURL() || null, member.user.bot, new Date().toISOString(), new Date().toISOString(), new Date().toISOString());
        logWithTimestamp(`member ${member.id}: ${member.user.username} in server ${serverMessage}`);
        await addMemberServerIfNotExist(member.id, guild.id, new Date().toISOString(), new Date().toISOString());

        logWithTimestamp(`checking all members roles on server ${serverMessage}`);
        for (const role of member.roles.cache.values()) {
            logWithTimestamp(`member ${member.id}: ${member.user.username}'s role ${role.id}: ${role.name}`);
            await addMemberRoleIfNotExist(member.id, guild.id, role.id);
        }
    }
}

async function addServerifNotExist(id, name, ownerId, iconUrl, joined, created, updated, is_active) {
    const serverCheck = await query(
        'SELECT * FROM servers WHERE (id = ?)',
        [id]
    );

    if (serverCheck.length == 0) {
        await execute(
            'INSERT INTO servers (id, server_name, owner_id, icon_url, created_at, joined_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, name, ownerId, iconUrl, created, joined, updated, is_active]
        );
    }
}

async function addServerIfNotExistByMessage(message) {
    await addServerifNotExist(message.guildId, message.guild.name, message.guild.ownerId, message.guild.iconURL() || null, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), true)
}

async function addChannelIfNotExist(id, serverId, name, channelType, description, position, totalMessages, lastMessage, isActive, createdAt, updatedAt) {
    const channelCheck = await query(
        'SELECT * FROM channels WHERE (id = ?)',
        [id]
    );

    if (channelCheck.length == 0) {
        await execute(
            'INSERT INTO channels (id, server_id, name, channel_type, description, position, total_messages, last_message, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, serverId, name, channelType, description, position, totalMessages, lastMessage, isActive, createdAt, updatedAt]
        );
    }
}

async function addChannelIfNotExistByMessage(message) {
    await addChannelIfNotExist(message.channelId, message.guildId, message.channel.name || 'unknown', message.channel.type || 'text', message.channel.topic || null, message.channel.position || 0, 0, null, true, new Date().toISOString(), new Date().toISOString())
}

async function addMemberIfNotExist(id, username, displayName, globalName, avatarUrl, bot, createdAt, updatedAt, lastSeen) {
    const memberCheck = await query(
        'SELECT * FROM members WHERE (id = ?)',
        [id]
    );

    if (memberCheck.length == 0) {
        await execute(
            'INSERT INTO members (id, username, display_name, global_name, avatar_url, bot, created_at, updated_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, username, displayName, globalName, avatarUrl, bot, createdAt, updatedAt, lastSeen]
        );
    }
}

async function addMemberServerIfNotExist(memberId, serverId, joinedAt, updatedAt) {
    const memberServerCheck = await query(
        'SELECT * FROM server_members WHERE (member_id = ?) AND (server_id = ?)',
        [memberId, serverId]
    );

    if (memberServerCheck.length == 0) {
        await execute(
            'INSERT INTO server_members (member_id, server_id, joined_at, updated_at) VALUES (?, ?, ?, ?)',
            [memberId, serverId, joinedAt, updatedAt]
        );
    }
}

async function addMemberIfNotExistByMessage(message) {
    await addMemberIfNotExist(message.author.id, message.author.username, message.author.displayName || null, message.author.globalName || null, message.author.displayAvatarURL() || null, message.author.bot, new Date().toISOString(), new Date().toISOString(), new Date().toISOString())
    await addMemberServerIfNotExist(message.author.id, message.guildId, new Date().toISOString(), new Date().toISOString())
}

async function addRoleIfNotExist(id, serverId, name, color, position, permissions, createdAt, updatedAt) {
    const roleCheck = await query(
        'SELECT * FROM roles WHERE (id = ?)',
        [id]
    );

    if (roleCheck.length == 0) {
        await execute(
            'INSERT INTO roles (id, server_id, name, color, position, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, serverId, name, color, position, permissions, createdAt, updatedAt]
        );
    }
}

async function addMemberRoleIfNotExist(memberId, serverId, roleId) {
    const memberRoleCheck = await query(
        'SELECT * FROM member_roles WHERE (member_id = ?) AND (server_id = ?) AND (role_id = ?)',
        [memberId, serverId, roleId]
    );

    if (memberRoleCheck.length == 0) {
        await execute(
            'INSERT INTO member_roles (member_id, server_id, role_id) VALUES (?, ?, ?)',
            [memberId, serverId, roleId]
        );
    }
}

async function addMessage(message) {
    await execute(
        'INSERT INTO messages (id, server_id, channel_id, user_id, reply_to, content, is_edited, is_deleted, created_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [message.id, message.guildId, message.channelId, message.author.id, message.reference?.messageId || null, message.content || '', false, false, message.createdAt?.toISOString() || new Date().toISOString(), null]
    );

    await execute(
        'UPDATE channels SET total_messages = COALESCE(total_messages, 0) + 1, last_message = ?, updated_at = ? WHERE (id = ?)',
        [message.id, new Date().toISOString(), message.channelId]
    );

    if (message.attachments.size > 0) {
        for (const att of message.attachments.values()) {
            await execute(
                'INSERT INTO attachments (id, message_id, name, url) VALUES (?, ?, ?, ?)',
                [att.id, message.id, att.name, att.url]
            );
        }
    }
}

async function editMessage(message) {
    let messageEditCheck = await query(
        'SELECT * FROM messages WHERE (og_id = ?)',
        [message.id]
    );

    if (messageEditCheck == undefined) {
        messageEditCheck = [];
    }

    await execute(
        'INSERT INTO messages (id, server_id, channel_id, user_id, og_id, reply_to, content, is_edited, is_deleted, created_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`${messageEditCheck.length + 1}-${message.id}`, message.guildId, message.channelId, message.author.id, message.id, message.reference?.messageId || null, message.content || '', true, false, message.createdAt?.toISOString() || new Date().toISOString(), message.editedAt?.toISOString() || new Date().toISOString()]
    );
}

async function deleteMessage(messageId) {
    await execute(
        'UPDATE messages SET is_deleted = true WHERE (id = ?) OR (og_id = ?)',
        [messageId, messageId]
    );
}

async function addReaction(reaction, user) {
    const message = reaction.message;
    const now = new Date().toISOString();
    const emoji = reaction.emoji?.id
        ? `${reaction.emoji.name}:${reaction.emoji.id}`
        : (reaction.emoji?.name || reaction.emoji?.toString() || '');

    await execute(
        'INSERT INTO reactions (id, message_id, user_id, emoji, is_deleted, created_at, updated_at, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [`${message.id}_${user.id}_${emoji}`, message.id, user.id, emoji, false, now, now, true]
    );
}

async function deleteReaction(reaction, user) {
    const message = reaction.message;
    const now = new Date().toISOString();
    const emoji = reaction.emoji?.id
        ? `${reaction.emoji.name}:${reaction.emoji.id}`
        : (reaction.emoji?.name || reaction.emoji?.toString() || '');

    await execute(
        'UPDATE reactions SET is_deleted = true, is_active = false, updated_at = ? WHERE (message_id = ?) AND (user_id = ?) AND (emoji = ?)',
        [now, message.id, user.id, emoji]
    );
}

async function deleteServerDataPermanently(serverId) {
    // Break channel->message FK links before removing messages.
    await execute(
        'UPDATE channels SET last_message = NULL WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM attachments WHERE (message_id IN (SELECT id FROM messages WHERE server_id = ?))',
        [serverId]
    );

    await execute(
        'DELETE FROM reactions WHERE (message_id IN (SELECT id FROM messages WHERE server_id = ?))',
        [serverId]
    );

    await execute(
        'DELETE FROM messages WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM member_roles WHERE (server_id = ?) OR (role_id IN (SELECT id FROM roles WHERE server_id = ?))',
        [serverId, serverId]
    );

    await execute(
        'DELETE FROM afk WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM auto_kick_rules WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM roles WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM server_members WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM channels WHERE (server_id = ?)',
        [serverId]
    );

    await execute(
        'DELETE FROM servers WHERE (id = ?)',
        [serverId]
    );

    // Remove global members that are no longer in any server tracked by this bot.
    await execute(
        'DELETE FROM members WHERE (id NOT IN (SELECT member_id FROM server_members))',
        []
    );
}

module.exports = {
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
};
