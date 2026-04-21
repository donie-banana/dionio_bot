require('dotenv').config({ path: '.env' });
const { Client, GatewayIntentBits } = require('discord.js');
const { initDatabase } = require('./db');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
    ],
});

client.once('ready', () => {
    console.log(`✓ Bot logged in as ${client.user.tag}`);
    initDatabase();
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    console.log(`[${message.guild?.name || 'DM'}] ${message.author.username}: ${message.content}`);
});

client.login(process.env.TOKEN);