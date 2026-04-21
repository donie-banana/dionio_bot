client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    console.log(`${message.author.id} sent: ${message.content}`);

});