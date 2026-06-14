import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './src/commands.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('Variables manquantes: DISCORD_TOKEN, CLIENT_ID et GUILD_ID sont obligatoires.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

try {
  console.log('Publication des commandes slash...');
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
    body: commands.map((command) => command.toJSON())
  });
  console.log('Commandes slash publiees avec succes.');
} catch (error) {
  console.error('Erreur pendant la publication des commandes:', error);
  process.exit(1);
}
