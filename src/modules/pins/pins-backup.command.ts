import * as formatters from '@discordjs/formatters';
import { ButtonStyle, type ChatInputCommandInteraction } from 'discord.js';
import type { ButtonId, SlashCommand } from '../../model';
import { ButtonBuilder } from '../../util/discord';
import {
	createInteractionMenuSession,
	rerender,
} from '../../util/discord/interaction-session';
import { ellipsis, MAX_MESSAGE_CHARACTER_LENGTH } from '../../util/string';

type PreviousPageButtonId = ButtonId<'previous-page'>;
type NextPageButtonId = ButtonId<'next-page'>;

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
		const ephemeral =
			interaction.options.getBoolean('ephemeral', /* required: */ false) ??
			true;

		if (!channel || !('isTextBased' in channel) || !channel.isTextBased()) {
			return;
		}

		const pinnedMessages = await channel.messages.fetchPinned(
			/* cache: */ false
		);

		const responseLines = [...pinnedMessages.values()].map((message, index) => {
			return `${index + 1}. ${message.url}: ${formatters.escapeMarkdown(ellipsis(message.content.replaceAll('\n', ' '), 200))}`;
		});

		const pages: { fromLine: number; toLine: number }[] = [];
		{
			let characterTally = 0;
			let totalLineTally = 0;

			const addPage = () => {
				const lastPageToLine = pages.at(-1)?.toLine ?? 0;
				pages.push({ fromLine: lastPageToLine, toLine: totalLineTally });
				characterTally = 0;
			};

			for (const responseLine of responseLines) {
				characterTally += responseLine.length + '\n'.length;
				totalLineTally++;

				if (characterTally > MAX_MESSAGE_CHARACTER_LENGTH) {
					addPage();
				}
			}

			if (characterTally > 0) {
				addPage();
			}
		}

		let currentPage = 0;
		await createInteractionMenuSession(
			interaction,
			async (_reason, menuSession) => {
				if (pages.length === 0) {
					return {
						content: formatters.italic('No pins on this channel'),
					};
				}

				if (pages.length > 1) {
					menuSession.onButtonInteraction({
						button: new ButtonBuilder()
							.setCustomId(
								menuSession.buttonId<PreviousPageButtonId>({
									type: 'previous-page',
								})
							)
							.setEmoji('⬅️')
							.setStyle(ButtonStyle.Secondary),
						byWho: [menuSession.interaction.user.id],
						async handle() {
							currentPage--;
							if (currentPage < 0) {
								currentPage = pages.length - 1;
							}

							return rerender;
						},
					});

					menuSession.onButtonInteraction({
						button: new ButtonBuilder()
							.setCustomId(
								menuSession.buttonId<NextPageButtonId>({
									type: 'next-page',
								})
							)
							.setEmoji('➡️')
							.setStyle(ButtonStyle.Secondary),
						byWho: [menuSession.interaction.user.id],
						async handle() {
							currentPage = (currentPage + 1) % pages.length;
							return rerender;
						},
					});
				}

				const { fromLine, toLine } = pages[currentPage];

				return {
					content: responseLines.slice(fromLine, toLine).join('\n'),
				};
			},
			{ ephemeral }
		);
	},
} satisfies SlashCommand<ChatInputCommandInteraction>;
