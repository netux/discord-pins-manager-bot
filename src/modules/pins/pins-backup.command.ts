import * as formatters from '@discordjs/formatters';
import { type ChatInputCommandInteraction } from 'discord.js';
import type { SlashCommand } from '../../model';
import { ellipsis } from '../../util/string';

export default {
	data: (command) =>
		command
			.setName('pins-backup')
			.setDescription('Show pins in this channel')
			.canBeUsedAnywhere()
			.addChannelOption((option) =>
				option
					.setName('channel')
					.setDescription('The channel from which pull the pins from')
					.setRequired(false)
			)
			.addBooleanOption((option) =>
				option
					.setName('ephemeral')
					.setDescription(`Whether to show the bot's response to other people`)
					.setRequired(false)
			),

	async execute(interaction) {
		const channel =
			interaction.options.getChannel('channel') ?? interaction.channel;

		if (!channel || !('isTextBased' in channel) || !channel.isTextBased()) {
			return;
		}

		const pinnedMessages = await channel.messages.fetchPinned(
			/* cache: */ false
		);

		// TODO(netux): paginate
		await interaction.reply({
			content: formatters.orderedList(
				pinnedMessages.map((message) => {
					return `${message.url}: ${formatters.escapeMarkdown(ellipsis(message.content.replaceAll('\n', ' '), 100))}`;
				}),
				/* startNumber: */ 0
			),
			ephemeral: interaction.options.getBoolean('ephemeral') ?? true,
		});
	},
} satisfies SlashCommand<ChatInputCommandInteraction>;
