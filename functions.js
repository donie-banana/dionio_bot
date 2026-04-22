const { initDatabase, query, execute, sql } = require('./db');

async function initialAddingOfAll(guilds) {
    for (const guild of guilds.values()) {
        await initialAddingOfOne(guild);
    }
}

async function initialAddingOfOne(guild) {
    await addServerifNotExist(guild.id, guild.name, guild.ownerId, guild.iconURL() || null, new Date().toISOString(), new Date().toISOString(), new Date().toISOString(), true);

    for (const channel of guild.channels.cache.values()) {
        await addChannelIfNotExist(channel.id, guild.id, channel.name || 'unknown', channel.type || 'text', channel.topic || null, channel.position || 0, 0, null, true, new Date().toISOString(), new Date().toISOString());
    }

    for (const role of guild.roles.cache.values()) {
        await addRoleIfNotExist(role.id, guild.id, role.name, role.hexColor || null, role.position || 0, role.permissions?.bitfield?.toString() || null, new Date().toISOString(), new Date().toISOString());
    }

    for (const member of guild.members.cache.values()) {
        await addMemberIfNotExist(member.id, guild.id, member.user.username, member.displayName || null, member.user.globalName || null, member.user.displayAvatarURL() || null, member.user.bot, new Date().toISOString(), new Date().toISOString(), new Date().toISOString());

        for (const role of member.roles.cache.values()) {
            await addMemberRoleIfNotExist(member.id, role.id);
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

async function addMemberIfNotExist(id, serverId, username, displayName, globalName, avatarUrl, bot, createdAt, updatedAt, lastSeen) {
    const memberCheck = await query(
        'SELECT * FROM members WHERE (id = ?) AND (server_id = ?)',
        [id, serverId]
    );

    if (memberCheck.length == 0) {
        await execute(
            'INSERT INTO members (id, server_id, username, display_name, global_name, avatar_url, bot, created_at, updated_at, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, serverId, username, displayName, globalName, avatarUrl, bot, createdAt, updatedAt, lastSeen]
        );
    }
}

async function addMemberIfNotExistByMessage(message) {
    await addMemberIfNotExist(message.author.id, message.guildId, message.author.username, message.author.displayName || null, message.author.globalName || null, message.author.displayAvatarURL() || null, message.author.bot, new Date().toISOString(), new Date().toISOString(), new Date().toISOString())
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

async function addMemberRoleIfNotExist(memberId, roleId) {
    const memberRoleCheck = await query(
        'SELECT * FROM member_roles WHERE (member_id = ?) AND (role_id = ?)',
        [memberId, roleId]
    );

    if (memberRoleCheck.length == 0) {
        await execute(
            'INSERT INTO member_roles (member_id, role_id) VALUES (?, ?)',
            [memberId, roleId]
        );
    }
}

async function addMessage(message) {
    await execute(
        'INSERT INTO messages (id, channel_id, user_id, content, is_edited, is_deleted, created_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [message.id, message.channelId, message.author.id, message.content || '', false, false, message.createdAt?.toISOString() || new Date().toISOString(), null]
    );

    await execute(
        'UPDATE channels SET total_messages = COALESCE(total_messages, 0) + 1, last_message = ?, updated_at = ? WHERE (id = ?)',
        [message.id, new Date().toISOString(), message.channelId]
    );
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
        'INSERT INTO messages (id, channel_id, user_id, og_id, content, is_edited, is_deleted, created_at, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`${messageEditCheck.length + 1}-${message.id}`, message.channelId, message.author.id, message.id, message.content || '', true, false, message.createdAt?.toISOString() || new Date().toISOString(), message.editedAt?.toISOString() || new Date().toISOString()]
    );
}

async function deleteMessage(messageId) {
    await execute(
        'UPDATE messages SET is_deleted = true WHERE (id = ?) OR (og_id = ?)',
        [messageId, messageId]
    );
}

module.exports = {
    addServerIfNotExistByMessage,
    addChannelIfNotExistByMessage,
    addMemberIfNotExistByMessage,
    addMessage,
    editMessage,
    deleteMessage,
    initialAddingOfAll,
    initialAddingOfOne,
};
