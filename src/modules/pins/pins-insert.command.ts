import * as formatters from '@discordjs/formatters';
import type { ChatInputCommandInteraction } from 'discord.js';
import { MessageType, SnowflakeUtil } from 'discord.js';
import { BUSY_EMOJI, DONE_EMOJI } from '../../discord/emoji';
import type { SlashCommand } from '../../model';

/* eslint-disable typescript-sort-keys/string-enum */
enum CleanUp {
	ALL = 'All',
	RESHUFFLE_ONLY = 'Only Reshuffle',
	NONE = "Don't bother",
}
/* eslint-enable typescript-sort-keys/string-enum */

export default {
	data: (command) =>
		command
			.setName('pins-insert')
			.setDescription(
				'Insert a pin into this channel, shuffling other pins around'
			)
			.canBeUsedAnywhere()
			.addStringOption((option) =>
				option
					.setName('message')
					.setDescription('ID or URL of the message to be pinned')
					.setRequired(true)
			)
			.addNumberOption((option) =>
				option
					.setName('position')
					.setDescription('The index at which to insert the pin. 1-based.')
					.setRequired(true)
			)
			.addChannelOption((option) =>
				option
					.setName('channel')
					.setDescription('The channel on which the message will be pinned')
					.setRequired(false)
			)
			.addStringOption((option) =>
				option
					.setName('clean-up')
					.setDescription(
						`Whether to remove all the "XYZ pinned a message" messages`
					)
					.setChoices(
						[CleanUp.ALL, CleanUp.RESHUFFLE_ONLY, CleanUp.NONE].map(
							(cleanUp) => ({
								name: cleanUp,
								value: cleanUp,
							})
						)
					)
					.setRequired(false)
			)
			.addBooleanOption((option) =>
				option
					.setName('ephemeral')
					.setDescription(`Whether to show the bot's response to other people`)
					.setRequired(false)
			),

	async execute(interaction) {
		const messageInput = interaction.options
			.getString('message', /* required: */ true)
			.trim();
		const positionInput = interaction.options.getNumber(
			'position',
			/* required: */ true
		);
		const channelInput =
			interaction.options.getChannel('channel') ?? interaction.channel;

		const cleanUp =
			(interaction.options.getString('clean-up') as CleanUp) ??
			CleanUp.RESHUFFLE_ONLY;
		const ephemeral = interaction.options.getBoolean('ephemeral') ?? true;

		if (
			!channelInput ||
			!('isTextBased' in channelInput) ||
			!channelInput.isTextBased()
		) {
			return;
		}

		let messageId: string;
		let channelId: string = channelInput?.id;
		const insertIndex = Math.max(1, positionInput) - 1;

		const messageUrlMatch =
			// https://discord.com/channels/<guild-id>/<channel-id>/<message-id>
			/^https?:\/\/(?:ptb\.)?discord\.com\/channels\/(?<guildId>\d+)\/(?<channelId>\d+)\/(?<messageId>\d+)$/.exec(
				messageInput
			);
		if (messageUrlMatch) {
			messageId = messageUrlMatch.groups!.messageId;
			channelId ||= messageUrlMatch.groups!.channelid;
		} else {
			const messageIdMatch = /^\d+$/.exec(messageInput);
			if (messageIdMatch) {
				messageId = messageIdMatch[0];
				channelId ||= interaction.channelId;
			} else {
				await interaction.reply({
					content: `No message found from "${messageInput}"`,
					ephemeral: true,
				});
				return;
			}
		}

		const channel = await interaction.client.channels.fetch(channelId);
		if (!channel) {
			await interaction.reply({
				content: `No channel with ID ${channelId} was found`,
				ephemeral: true,
			});
			return;
		}

		if (!channel.isTextBased()) {
			await interaction.reply({
				content: `Channel ${channel.name} is not text-based`,
				ephemeral: true,
			});
			return;
		}

		const messageToPin = await channel.messages.fetch(messageId);

		if (!messageToPin) {
			await interaction.reply({
				content: `Message not found`,
				ephemeral: true,
			});
			return;
		}

		await interaction.reply({
			content: `${formatters.formatEmoji(BUSY_EMOJI)} Pinning ${messageToPin.url} at position ${insertIndex + 1}...`,
			ephemeral,
		});

		const startTime = new Date();

		if (messageToPin.pinned) {
			await messageToPin.unpin(
				/* reason: */ 'moving pinned message to another position'
			);
		}

		// Newest first
		const prevPinnedMessages = await channelInput.messages.fetchPinned(
			/* cache: */ false
		);

		await messageToPin.pin(
			`pinned by @${interaction.user.username} via /pin-insert`
		);

		const reshuffleReason = `reshuffling due to pin of ${messageToPin.url} by @${interaction.user.username}`;
		for (let pinIndex = insertIndex - 1; pinIndex >= 0; pinIndex--) {
			const message = prevPinnedMessages.at(pinIndex)!;
			await message.unpin(/* reason: */ reshuffleReason);

			await message.pin(/* reason: */ reshuffleReason);
		}

		await interaction.editReply({
			content: `${DONE_EMOJI} Done pinning ${messageToPin.url} at position ${insertIndex + 1}`,
		});

		if (cleanUp !== CleanUp.NONE) {
			const messagesSinceStart = (
				await channel.messages.fetch({
					after: SnowflakeUtil.generate({ timestamp: startTime }).toString(),
				})
			).reverse();

			let pinMessagesSeen = 0;
			for (const message of messagesSinceStart.values()) {
				if (message.type !== MessageType.ChannelPinnedMessage) {
					continue;
				}

				if (message.author.id !== interaction.client.user.id) {
					continue;
				}

				pinMessagesSeen++;

				if (pinMessagesSeen === 1 && cleanUp === CleanUp.RESHUFFLE_ONLY) {
					continue;
				}

				if (!message.deletable) {
					continue;
				}

				await message.delete();
			}
		}
	},
} satisfies SlashCommand<ChatInputCommandInteraction>;
