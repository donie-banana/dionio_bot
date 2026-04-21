client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  console.log(`${message.author.id} sent: ${message.content}`);

  // here is where you will:
  // - update last_active in DB
  // - check if user was AFK
  // - remove AFK if needed
});