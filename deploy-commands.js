import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './src/commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const requiredModRoleId = process.env.REQUIRED_MOD_ROLE_ID || '1508156771569504428';
const registerGlobalCommands = process.env.REGISTER_GLOBAL_COMMANDS !== 'false';

if (!token || !clientId || !guildId) {
  console.error('Variables manquantes: DISCORD_TOKEN, CLIENT_ID et GUILD_ID sont obligatoires.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  const commandBody = commands.map((command) => command.toJSON());

  console.log(`Publication des commandes slash sur le serveur ${guildId}...`);
  const guildCommands = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commandBody
  });
  console.log(`${guildCommands.length} commandes slash serveur publiees avec succes.`);

  if (registerGlobalCommands) {
    console.log('Publication des commandes slash globales pour affichage sur le profil du bot...');
    const globalCommands = await rest.put(Routes.applicationCommands(clientId), {
      body: commandBody
    });
    console.log(`${globalCommands.length} commandes slash globales publiees avec succes.`);
  }

  console.log(`Acces aux commandes reserve au role ${requiredModRoleId}.`);
} catch (error) {
  console.error('Erreur pendant la publication des commandes:', error);
  process.exit(1);
}
