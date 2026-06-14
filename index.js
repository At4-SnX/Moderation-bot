import 'dotenv/config';
import {
  Client,
  Collection,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Partials,
  PermissionFlagsBits,
  REST,
  Routes
} from 'discord.js';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { commands } from './src/commands.js';

const BLUE = 0x0055a4;
const DARK_BLUE = 0x002654;
const WHITE = 0xffffff;
const RED = 0xef4135;
const DATA_DIR = path.resolve('data');
const CONFIG_PATH = path.join(DATA_DIR, 'config.json');
const ownerIds = new Set((process.env.OWNER_IDS || '').split(',').map((id) => id.trim()).filter(Boolean));
const requiredModRoleId = process.env.REQUIRED_MOD_ROLE_ID || '1508156771569504428';
const autoRegisterCommands = process.env.REGISTER_COMMANDS_ON_START !== 'false';
const registerGlobalCommands = process.env.REGISTER_GLOBAL_COMMANDS !== 'false';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User]
});

const joinBuckets = new Collection();
const messageBuckets = new Collection();
let store = { guilds: {} };

function defaultGuildConfig() {
  return {
    logChannelId: process.env.DEFAULT_LOG_CHANNEL_ID || null,
    muteRoleId: process.env.DEFAULT_MUTE_ROLE_ID || null,
    antiRaid: { enabled: true, limit: 6, windowMs: 30000, action: 'kick' },
    antiBot: { enabled: true, allowlist: [] },
    antiSpam: { enabled: true, limit: 6, windowMs: 8000, muteMinutes: 10 },
    antiMentions: { enabled: true, limit: 8, muteMinutes: 30 },
    lockedRoles: [],
    lockedChannels: [],
    warnings: {}
  };
}

async function loadStore() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(CONFIG_PATH)) {
    await saveStore();
    return;
  }
  try {
    store = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  } catch {
    store = { guilds: {} };
    await saveStore();
  }
}

async function saveStore() {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(store, null, 2));
}

function getConfig(guildId) {
  if (!store.guilds[guildId]) store.guilds[guildId] = defaultGuildConfig();
  return store.guilds[guildId];
}

function officialEmbed(title, description, color = BLUE) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🔵 ${title}`)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: 'Gendarmerie Nationale - Brigade Numerique' });
}

async function replySafe(interaction, payload) {
  if (interaction.deferred || interaction.replied) return interaction.editReply(payload);
  return interaction.reply(payload);
}

async function logAction(guild, embed) {
  const config = getConfig(guild.id);
  const channel = config.logChannelId ? await guild.channels.fetch(config.logChannelId).catch(() => null) : null;
  if (channel?.isTextBased()) await channel.send({ embeds: [embed] }).catch(() => null);
}

async function notifyUser(user, title, message) {
  const embed = officialEmbed(title, message, DARK_BLUE);
  return user.send({ embeds: [embed] }).catch(() => null);
}

function isProtectedModerator(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator) || ownerIds.has(member.id);
}

async function registerSlashCommands() {
  const token = process.env.DISCORD_TOKEN;
  const guildId = process.env.GUILD_ID;
  const clientId = process.env.CLIENT_ID || client.user.id;

  if (!token || !clientId || !guildId) {
    console.log('Commandes slash non publiees: DISCORD_TOKEN, CLIENT_ID ou GUILD_ID manquant.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);
  const commandBody = commands.map((command) => command.toJSON());

  console.log(`Publication des commandes slash sur le serveur ${guildId}...`);
  const guildCommands = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandBody });
  console.log(`${guildCommands.length} commandes slash serveur publiees avec succes.`);

  if (registerGlobalCommands) {
    console.log('Publication des commandes slash globales pour affichage sur le profil du bot...');
    const globalCommands = await rest.put(Routes.applicationCommands(clientId), { body: commandBody });
    console.log(`${globalCommands.length} commandes slash globales publiees avec succes.`);
  }

  console.log(`Acces aux commandes reserve au role ${requiredModRoleId}.`);
}

async function memberHasRequiredRole(interaction) {
  if (!requiredModRoleId) return true;
  const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
  return Boolean(member?.roles.cache.has(requiredModRoleId));
}

async function ensureMuteRole(guild) {
  const config = getConfig(guild.id);
  let role = config.muteRoleId ? await guild.roles.fetch(config.muteRoleId).catch(() => null) : null;
  if (role) return role;

  role = await guild.roles.create({
    name: '🔵 Mute - Gendarmerie',
    color: DARK_BLUE,
    reason: 'Creation automatique du role de mute'
  });
  config.muteRoleId = role.id;
  await saveStore();

  for (const [, channel] of guild.channels.cache) {
    if (!channel.permissionOverwrites?.edit) continue;
    await channel.permissionOverwrites.edit(role, {
      SendMessages: false,
      AddReactions: false,
      Speak: false,
      CreatePublicThreads: false,
      CreatePrivateThreads: false
    }).catch(() => null);
  }
  return role;
}

async function muteMember(member, minutes, reason, moderatorLabel = 'Protection automatique') {
  const role = await ensureMuteRole(member.guild);
  await member.roles.add(role, reason);
  await member.timeout(minutes * 60 * 1000, reason).catch(() => null);
  setTimeout(async () => {
    const fresh = await member.guild.members.fetch(member.id).catch(() => null);
    if (fresh) await fresh.roles.remove(role, 'Fin automatique du mute').catch(() => null);
  }, minutes * 60 * 1000);

  await notifyUser(
    member.user,
    'Sanction administrative',
    `Vous avez ete mute sur **${member.guild.name}** pendant **${minutes} minute(s)**.\nMotif: **${reason || 'Non precise'}**.`
  );
  await logAction(member.guild, officialEmbed('Mute applique', `Membre: ${member.user.tag}\nDuree: ${minutes} minute(s)\nMotif: ${reason || 'Non precise'}\nAgent: ${moderatorLabel}`, RED));
}

client.once(Events.ClientReady, async () => {
  await loadStore();
  if (autoRegisterCommands) {
    await registerSlashCommands().catch((error) => {
      console.error('Erreur pendant la publication des commandes slash:', error);
    });
  }
  console.log(`Connecte en tant que ${client.user.tag}`);
});

client.on(Events.GuildMemberAdd, async (member) => {
  const config = getConfig(member.guild.id);

  if (member.user.bot && config.antiBot.enabled && !config.antiBot.allowlist.includes(member.id)) {
    await notifyUser(member.user, 'Acces refuse', `Votre bot a ete retire de **${member.guild.name}** par la protection antibot.`);
    await member.kick('Protection antibot active').catch(() => null);
    await logAction(member.guild, officialEmbed('Antibot', `Bot retire: ${member.user.tag} (${member.id})`, RED));
    return;
  }

  if (!config.antiRaid.enabled) return;
  const now = Date.now();
  const bucket = joinBuckets.get(member.guild.id) || [];
  const recent = bucket.filter((entry) => now - entry < config.antiRaid.windowMs);
  recent.push(now);
  joinBuckets.set(member.guild.id, recent);

  if (recent.length >= config.antiRaid.limit) {
    await logAction(member.guild, officialEmbed('Alerte antiraid', `${recent.length} arrivees detectees en ${Math.round(config.antiRaid.windowMs / 1000)} secondes.`, RED));
    if (config.antiRaid.action === 'kick') {
      await member.kick('Protection antiraid active').catch(() => null);
    }
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (!message.guild || message.author.bot) return;
  const member = await message.guild.members.fetch(message.author.id).catch(() => null);
  if (!member || isProtectedModerator(member)) return;

  const config = getConfig(message.guild.id);
  const mentionsCount = message.mentions.users.size + message.mentions.roles.size;
  if (config.antiMentions.enabled && mentionsCount >= config.antiMentions.limit) {
    await message.delete().catch(() => null);
    await muteMember(member, config.antiMentions.muteMinutes, 'Mentions massives', 'Systeme antimentions');
    return;
  }

  if (!config.antiSpam.enabled) return;
  const key = `${message.guild.id}:${message.author.id}`;
  const now = Date.now();
  const bucket = (messageBuckets.get(key) || []).filter((entry) => now - entry < config.antiSpam.windowMs);
  bucket.push(now);
  messageBuckets.set(key, bucket);

  if (bucket.length >= config.antiSpam.limit) {
    await message.channel.bulkDelete(Math.min(bucket.length, 10), true).catch(() => null);
    messageBuckets.delete(key);
    await muteMember(member, config.antiSpam.muteMinutes, 'Spam detecte', 'Systeme antispam');
  }
});

client.on(Events.RoleUpdate, async (oldRole, newRole) => {
  const config = getConfig(newRole.guild.id);
  if (!config.lockedRoles.includes(newRole.id)) return;
  if (oldRole.name !== newRole.name) await newRole.setName(oldRole.name, 'Role verrouille').catch(() => null);
  if (oldRole.color !== newRole.color) await newRole.setColor(oldRole.color, 'Role verrouille').catch(() => null);
  if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) await newRole.setPermissions(oldRole.permissions, 'Role verrouille').catch(() => null);
  await logAction(newRole.guild, officialEmbed('Role protege restaure', `Role: ${newRole.name}`, RED));
});

client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
  const config = getConfig(newChannel.guild.id);
  if (!config.lockedChannels.includes(newChannel.id)) return;
  if (oldChannel.name !== newChannel.name) await newChannel.setName(oldChannel.name, 'Salon verrouille').catch(() => null);
  await logAction(newChannel.guild, officialEmbed('Salon protege restaure', `Salon: ${newChannel.name}`, RED));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || !interaction.guild) return;
  const config = getConfig(interaction.guild.id);

  try {
    if (!(await memberHasRequiredRole(interaction))) {
      return replySafe(interaction, {
        embeds: [officialEmbed('Acces refuse', `Cette commande est reservee au role <@&${requiredModRoleId}>.`, RED)],
        ephemeral: true
      });
    }

    if (interaction.commandName === 'help') {
      const list = commands.map((command) => `/${command.name} - ${command.description}`).join('\n');
      return replySafe(interaction, { embeds: [officialEmbed('Commandes disponibles', list)], ephemeral: true });
    }

    if (interaction.commandName === 'ping') {
      return replySafe(interaction, { embeds: [officialEmbed('Controle radio', `Latence: **${client.ws.ping} ms**\nEtat: **operationnel**`, WHITE)], ephemeral: true });
    }

    if (interaction.commandName === 'setup') {
      const logs = interaction.options.getChannel('logs');
      const muteRole = interaction.options.getRole('role_mute');
      if (logs) config.logChannelId = logs.id;
      if (muteRole) config.muteRoleId = muteRole.id;
      await saveStore();
      return replySafe(interaction, { embeds: [officialEmbed('Configuration enregistree', 'Les parametres de moderation ont ete mis a jour.')], ephemeral: true });
    }

    if (interaction.commandName === 'config') {
      const option = interaction.options.getString('option', true);
      const enabled = interaction.options.getBoolean('actif', true);
      const limit = interaction.options.getInteger('limite');
      config[option].enabled = enabled;
      if (limit && 'limit' in config[option]) config[option].limit = limit;
      await saveStore();
      return replySafe(interaction, { embeds: [officialEmbed('Protection mise a jour', `${option}: **${enabled ? 'active' : 'inactive'}**${limit ? `\nLimite: **${limit}**` : ''}`)], ephemeral: true });
    }

    if (interaction.commandName === 'warn') {
      const user = interaction.options.getUser('membre', true);
      const reason = interaction.options.getString('raison', true);
      config.warnings[user.id] = config.warnings[user.id] || [];
      config.warnings[user.id].push({ reason, moderator: interaction.user.id, date: new Date().toISOString() });
      await saveStore();
      await notifyUser(user, 'Avertissement officiel', `Vous avez recu un avertissement sur **${interaction.guild.name}**.\nMotif: **${reason}**.`);
      await logAction(interaction.guild, officialEmbed('Avertissement', `Membre: ${user.tag}\nMotif: ${reason}\nAgent: ${interaction.user.tag}`, RED));
      return replySafe(interaction, { embeds: [officialEmbed('Avertissement transmis', `${user} a ete averti.`)] });
    }

    if (interaction.commandName === 'mute') {
      const member = interaction.options.getMember('membre');
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = interaction.options.getString('raison') || 'Non precise';
      if (!member) return replySafe(interaction, { content: 'Membre introuvable.', ephemeral: true });
      await muteMember(member, minutes, reason, interaction.user.tag);
      return replySafe(interaction, { embeds: [officialEmbed('Mute applique', `${member} a ete mute pendant ${minutes} minute(s).`)] });
    }

    if (interaction.commandName === 'unmute') {
      const member = interaction.options.getMember('membre');
      const reason = interaction.options.getString('raison') || 'Non precise';
      if (!member) return replySafe(interaction, { content: 'Membre introuvable.', ephemeral: true });
      const role = config.muteRoleId ? await interaction.guild.roles.fetch(config.muteRoleId).catch(() => null) : null;
      if (role) await member.roles.remove(role, reason).catch(() => null);
      await member.timeout(null, reason).catch(() => null);
      await notifyUser(member.user, 'Fin de sanction', `Votre mute sur **${interaction.guild.name}** a ete retire.\nMotif: **${reason}**.`);
      await logAction(interaction.guild, officialEmbed('Unmute', `Membre: ${member.user.tag}\nAgent: ${interaction.user.tag}\nMotif: ${reason}`));
      return replySafe(interaction, { embeds: [officialEmbed('Mute retire', `${member} peut de nouveau participer.`)] });
    }

    if (interaction.commandName === 'kick') {
      const member = interaction.options.getMember('membre');
      const reason = interaction.options.getString('raison') || 'Non precise';
      if (!member) return replySafe(interaction, { content: 'Membre introuvable.', ephemeral: true });
      await notifyUser(member.user, 'Exclusion du serveur', `Vous avez ete exclu de **${interaction.guild.name}**.\nMotif: **${reason}**.`);
      await member.kick(reason);
      await logAction(interaction.guild, officialEmbed('Kick', `Membre: ${member.user.tag}\nAgent: ${interaction.user.tag}\nMotif: ${reason}`, RED));
      return replySafe(interaction, { embeds: [officialEmbed('Exclusion appliquee', `${member.user.tag} a ete exclu.`)] });
    }

    if (interaction.commandName === 'ban') {
      const user = interaction.options.getUser('membre', true);
      const reason = interaction.options.getString('raison') || 'Non precise';
      const days = interaction.options.getInteger('jours_messages') || 0;
      await notifyUser(user, 'Bannissement du serveur', `Vous avez ete banni de **${interaction.guild.name}**.\nMotif: **${reason}**.`);
      await interaction.guild.members.ban(user, { reason, deleteMessageSeconds: days * 86400 });
      await logAction(interaction.guild, officialEmbed('Ban', `Membre: ${user.tag}\nAgent: ${interaction.user.tag}\nMotif: ${reason}`, RED));
      return replySafe(interaction, { embeds: [officialEmbed('Bannissement applique', `${user.tag} a ete banni.`)] });
    }

    if (interaction.commandName === 'unban') {
      const id = interaction.options.getString('id', true);
      const reason = interaction.options.getString('raison') || 'Non precise';
      await interaction.guild.members.unban(id, reason);
      await logAction(interaction.guild, officialEmbed('Unban', `ID: ${id}\nAgent: ${interaction.user.tag}\nMotif: ${reason}`));
      return replySafe(interaction, { embeds: [officialEmbed('Debannissement applique', `L'utilisateur ${id} a ete debanni.`)] });
    }

    if (interaction.commandName === 'clear') {
      const amount = interaction.options.getInteger('nombre', true);
      await interaction.channel.bulkDelete(amount, true);
      await logAction(interaction.guild, officialEmbed('Nettoyage', `${amount} message(s) supprime(s) dans ${interaction.channel} par ${interaction.user.tag}`));
      return replySafe(interaction, { embeds: [officialEmbed('Nettoyage effectue', `${amount} message(s) supprime(s).`)], ephemeral: true });
    }

    if (interaction.commandName === 'slowmode') {
      const seconds = interaction.options.getInteger('secondes', true);
      await interaction.channel.setRateLimitPerUser(seconds, `Slowmode regle par ${interaction.user.tag}`);
      return replySafe(interaction, { embeds: [officialEmbed('Mode lent', `Delai du salon: **${seconds} seconde(s)**.`)] });
    }

    if (interaction.commandName === 'lockdown') {
      const active = interaction.options.getBoolean('actif', true);
      const reason = interaction.options.getString('raison') || 'Procedure de securite';
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: active ? false : null
      }, { reason });
      await logAction(interaction.guild, officialEmbed(active ? 'Salon verrouille' : 'Salon deverrouille', `Salon: ${interaction.channel}\nAgent: ${interaction.user.tag}\nMotif: ${reason}`, active ? RED : BLUE));
      return replySafe(interaction, { embeds: [officialEmbed(active ? 'Lockdown actif' : 'Lockdown leve', `${interaction.channel} a ete ${active ? 'verrouille' : 'deverrouille'}.`)] });
    }

    if (interaction.commandName === 'lockrole') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'list') {
        const roles = config.lockedRoles.map((id) => `<@&${id}>`).join('\n') || 'Aucun role protege.';
        return replySafe(interaction, { embeds: [officialEmbed('Roles proteges', roles)], ephemeral: true });
      }
      const role = interaction.options.getRole('role', true);
      if (sub === 'add' && !config.lockedRoles.includes(role.id)) config.lockedRoles.push(role.id);
      if (sub === 'remove') config.lockedRoles = config.lockedRoles.filter((id) => id !== role.id);
      await saveStore();
      return replySafe(interaction, { embeds: [officialEmbed('Protection role', `${role} est maintenant ${sub === 'add' ? 'protege' : 'deverrouille'}.`)], ephemeral: true });
    }

    if (interaction.commandName === 'lockchannel') {
      const sub = interaction.options.getSubcommand();
      if (sub === 'list') {
        const channels = config.lockedChannels.map((id) => `<#${id}>`).join('\n') || 'Aucun salon protege.';
        return replySafe(interaction, { embeds: [officialEmbed('Salons proteges', channels)], ephemeral: true });
      }
      const channel = interaction.options.getChannel('salon', true);
      if (sub === 'add' && !config.lockedChannels.includes(channel.id)) config.lockedChannels.push(channel.id);
      if (sub === 'remove') config.lockedChannels = config.lockedChannels.filter((id) => id !== channel.id);
      await saveStore();
      return replySafe(interaction, { embeds: [officialEmbed('Protection salon', `${channel} est maintenant ${sub === 'add' ? 'protege' : 'deverrouille'}.`)], ephemeral: true });
    }
  } catch (error) {
    console.error(error);
    return replySafe(interaction, {
      embeds: [officialEmbed('Incident procedure', 'Une erreur est survenue. Verifie mes permissions et la position de mon role.', RED)],
      ephemeral: true
    }).catch(() => null);
  }
});

if (!process.env.DISCORD_TOKEN) {
  console.error('DISCORD_TOKEN manquant.');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);
