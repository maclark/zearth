import 'dotenv/config';
import './seethezot.js';
import { Client, GatewayIntentBits, Partials, ChannelType } from 'discord.js';
import { handleGameInput, setGeorgePlayer } from './operationHandler.js';
import { startHandlingDiscordInput } from './output.js';  // Import your logging functions
import { 
  setLizzieAvailable, 
  setLizzieUnavailable, 
  setChannels, 
  unassignAllMembersJustInCase } 
  from './lizzie.js';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});


client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  const publicSquare = client.channels.cache.find(channel => channel.name === 'public-square');
  const seethezotChannel = client.channels.cache.find(channel => channel.name === 'see-the-zot');
  if (!publicSquare) console.log("no public-square?");
  if (!seethezotChannel) console.log("no see-the-zot?");
  setChannels(seethezotChannel, publicSquare);

  //seethezotChannel.send(`\`\`\`${lizzieSummary}\n\`\`\``).catch(console.error);
  //seethezotChannel.send(`\`\`\`a message for lizzie to edit\n\`\`\``).catch(console.error);

  unassignAllMembersJustInCase();
  setLizzieAvailable(seethezotChannel);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  if (message.channel.type === ChannelType.DM) {
    console.log(`${message.author.username} says: ${message.content}`);
    const playerName = startHandlingDiscordInput(message.author);
    setGeorgePlayer(playerName);
    try {
      handleGameInput(message.content);
    }
    catch (err) {
      console.log(`\n\nERROR IN handleGameInput FROM MESSAGE: ${message.content}\n\nError: ${err.message}\nStack trace:\n${err.stack}\n\n`);
      message.author.send(`\`\`\`Error encountered!\n\n${err}\n\n\From last message:\`\`\``
                          + message.content 
                          + "\n```(Complain to Max!)```");
      console.log("but you can proceed...");
    }  
  }

});

client.login(process.env.DISCORD_TOKEN);

  // Handle SIGINT (Ctrl + C)
  process.on('SIGINT', async () => {
  console.log('SIGINT received. Performing cleanup before exiting...');
  
  setLizzieUnavailable();

  // Exit the process
  process.exit();
});


