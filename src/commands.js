import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Affiche toutes les commandes de la brigade numerique.'),

  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Controle la disponibilite du bot.'),

  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Configure les salons et roles de moderation.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName('logs')
        .setDescription('Salon du journal de moderation')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName('role_mute')
        .setDescription('Role applique lors des mutes')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('config')
    .setDescription('Active ou regle les protections automatiques.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('option')
        .setDescription('Protection a configurer')
        .setRequired(true)
        .addChoices(
          { name: 'antiraid', value: 'antiRaid' },
          { name: 'antibot', value: 'antiBot' },
          { name: 'antispam', value: 'antiSpam' },
          { name: 'antimentions', value: 'antiMentions' }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName('actif')
        .setDescription('Activer ou desactiver')
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName('limite')
        .setDescription('Seuil de detection')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Adresse un avertissement officiel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre vise').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(true)),

  new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute temporairement un membre.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre vise').setRequired(true))
    .addIntegerOption((option) => option.setName('minutes').setDescription('Duree en minutes').setRequired(true).setMinValue(1).setMaxValue(40320))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false)),

  new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Retire le mute d'un membre.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre vise').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false)),

  new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Exclut un membre du serveur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre vise').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false)),

  new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Bannit un membre du serveur.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) => option.setName('membre').setDescription('Membre vise').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false))
    .addIntegerOption((option) => option.setName('jours_messages').setDescription('Jours de messages a supprimer').setRequired(false).setMinValue(0).setMaxValue(7)),

  new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Debannit un utilisateur par ID.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) => option.setName('id').setDescription('ID Discord').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false)),

  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime un nombre de messages.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) => option.setName('nombre').setDescription('Entre 1 et 100').setRequired(true).setMinValue(1).setMaxValue(100)),

  new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Regle le mode lent du salon.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) => option.setName('secondes').setDescription('0 pour desactiver').setRequired(true).setMinValue(0).setMaxValue(21600)),

  new SlashCommandBuilder()
    .setName('lockdown')
    .setDescription('Verrouille ou deverrouille le salon actuel.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addBooleanOption((option) => option.setName('actif').setDescription('Etat du verrouillage').setRequired(true))
    .addStringOption((option) => option.setName('raison').setDescription('Motif').setRequired(false)),

  new SlashCommandBuilder()
    .setName('lockrole')
    .setDescription('Gere les roles proteges contre les modifications non autorisees.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub.setName('add').setDescription('Protege un role').addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand((sub) => sub.setName('remove').setDescription('Retire la protection').addRoleOption((option) => option.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand((sub) => sub.setName('list').setDescription('Liste les roles proteges')),

  new SlashCommandBuilder()
    .setName('lockchannel')
    .setDescription('Gere les salons proteges contre les modifications non autorisees.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub.setName('add').setDescription('Protege un salon').addChannelOption((option) => option.setName('salon').setDescription('Salon').setRequired(true)))
    .addSubcommand((sub) => sub.setName('remove').setDescription('Retire la protection').addChannelOption((option) => option.setName('salon').setDescription('Salon').setRequired(true)))
    .addSubcommand((sub) => sub.setName('list').setDescription('Liste les salons proteges'))
];
