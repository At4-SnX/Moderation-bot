# Bot Discord Moderation - Gendarmerie Nationale

Bot JavaScript Discord.js v14 pret pour Railway.

## Fonctions incluses

- Commandes slash `/`
- `/help` avec toutes les commandes
- Sanctions classiques : avertir, mute, unmute, kick, ban, unban
- Nettoyage de messages, slowmode, lockdown
- Anti-raid : detection d'arrivees massives
- Anti-spam et anti-mentions
- Anti-bot configurable
- Roles verrouilles
- Salons verrouilles
- Journal de moderation
- Notification privee de la personne sanctionnee quand Discord le permet
- Couleurs et presentation bleu Gendarmerie

## Installation locale

```bash
npm install
cp .env.example .env
```

Remplis `.env`, puis enregistre les commandes slash :

```bash
npm run deploy
npm start
```

## Railway

1. Envoie ce dossier sur GitHub.
2. Cree un projet Railway depuis le repo GitHub.
3. Ajoute les variables :
   - `DISCORD_TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
   - `OWNER_IDS`
   - `DEFAULT_LOG_CHANNEL_ID` optionnel
   - `DEFAULT_MUTE_ROLE_ID` optionnel
4. Lance une fois `npm run deploy` localement ou dans un Railway job pour publier les commandes.
5. Le service demarre avec `npm start`.

## Permissions Discord conseillees

Le bot doit avoir au minimum :

- Manage Roles
- Manage Channels
- Moderate Members
- Kick Members
- Ban Members
- Manage Messages
- View Audit Log
- Send Messages
- Embed Links
- Read Message History

Place le role du bot au-dessus des roles qu'il doit moderer.

## Note stockage

Le fichier `config.json` est cree automatiquement. Sur Railway, ajoute un volume si tu veux conserver les reglages entre redeploiements.
