import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';

export const client = new DiscordClient({
	intents: [GatewayIntentBits.DirectMessages, GatewayIntentBits.Guilds],
});
