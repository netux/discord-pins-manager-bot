import { Events } from 'discord.js';
import { type Event, type Module } from '../../model';

export default class implements Module {
	readonly events = [
		{
			name: Events.ClientReady,
			async execute(client) {
				console.log(`Ready! Logged in as ${client.user.tag}`);
			},
		} satisfies Event<Events.ClientReady>,
	];
}
