import type { ChatInputCommandInteraction } from 'discord.js';
import type { SlashCommand } from '../../model';

export default {
	data: (command) =>
		command
			.setName('ping')
			.setDescription('pong!')
			.canBeUsedAnywhere()
			.addBooleanOption((option) =>
				option
					.setName('ephemeral')
					.setDescription(`Whether to show the bot's response to other people`)
			),

	async execute(interaction) {
		await interaction.reply({
			content: 'Pong!',
			ephemeral: interaction.options.getBoolean('ephemeral') ?? true,
		});
	},
} satisfies SlashCommand<ChatInputCommandInteraction>;
