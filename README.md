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
   - `REQUIRED_MOD_ROLE_IDS=1508156771569504428,1508184761380638820`
   - `REGISTER_COMMANDS_ON_START=true`
   - `REGISTER_GLOBAL_COMMANDS=true`
   - `PRESENCE_TEXT=〃Gendarmerie EHRP - IS`
   - `OWNER_IDS`
   - `DEFAULT_LOG_CHANNEL_ID` optionnel
   - `DEFAULT_MUTE_ROLE_ID` optionnel
4. Le service demarre avec `npm start`.

Au demarrage, Railway doit afficher :

```text
Publication des commandes slash sur le serveur ...
... commandes slash serveur publiees avec succes.
Publication des commandes slash globales pour affichage sur le profil du bot...
... commandes slash globales publiees avec succes.
Acces aux commandes reserve aux roles 1508156771569504428, 1508184761380638820.
```

Tu peux aussi lancer `npm run deploy` localement si tu veux republier les commandes manuellement.

Les commandes serveur arrivent normalement rapidement. Les commandes globales, celles visibles sur le profil du bot, peuvent prendre quelques minutes avant d'apparaitre chez Discord.

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
