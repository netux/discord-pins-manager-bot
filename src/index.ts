import process from 'node:process';
import { inspect } from 'node:util';
import { ChatInputCommandInteraction, Events } from 'discord.js';
import { client as discordClient } from './discord';
import type { ContextMenuCommand, SlashCommand } from './model';
import getModules from './modules';
import {
	getContextMenuCommandRESTPostAPIData,
	getSlashCommandRESTPostAPIData,
} from './util/discord';

void Promise.all(
	[
		// discord client
		async () => {
			await discordClient.login(process.env.DISCORD_TOKEN);
		},
	].map(async (fn) => fn())
).then(() => {
	const modules = getModules({
		discordClient,
	});

	// #region Commands
	const slashCommands = Object.values(modules).reduce((map, module) => {
		for (const command of module.slashCommands ?? []) {
			const { name: commandName } = getSlashCommandRESTPostAPIData(command);
			map.set(commandName, command);
		}

		return map;
	}, new Map<string, SlashCommand>());

	const contextMenuCommands = Object.values(modules).reduce((map, module) => {
		for (const command of module.contextMenuCommands ?? []) {
			const { name: commandName } =
				getContextMenuCommandRESTPostAPIData(command);
			map.set(commandName, command);
		}

		return map;
	}, new Map<string, ContextMenuCommand>());

	discordClient.on(Events.InteractionCreate, async (interaction) => {
		const isChatInputCommand = interaction.isChatInputCommand();
		const isAutocomplete = interaction.isAutocomplete();
		const isContextMenu = interaction.isContextMenuCommand();

		if (isChatInputCommand || isAutocomplete) {
			const command = slashCommands.get(interaction.commandName);

			if (!command) {
				throw new Error(
					`Slash command '${interaction.commandName}' not found.`
				);
			}

			if (isChatInputCommand) {
				try {
					await command.execute?.(interaction);
				} catch (error) {
					console.error(
						`Error handling slash command interaction /${interaction.commandName}`,
						error
					);
				}
			} else if (isAutocomplete) {
				const focusedOption = interaction.options.getFocused(true);
				const autocompleteCallback = command.autocomplete?.[focusedOption.name];

				try {
					await autocompleteCallback?.(interaction);
				} catch (error) {
					console.error(
						`Error handling autocomplete interaction /${interaction.commandName} ${focusedOption.name}:${focusedOption.value}…`,
						error
					);
				}
			}

			if (
				(isChatInputCommand &&
					interaction instanceof ChatInputCommandInteraction) ||
				isAutocomplete
			) {
				const subcommandName = interaction.options.getSubcommand(false);
				if (subcommandName) {
					const subcommand = command.subcommands?.get(subcommandName);
					if (!subcommand) {
						throw new Error(
							`Subcommand '${interaction.commandName} ${subcommandName}' not found.`
						);
					}

					if (isChatInputCommand) {
						try {
							await subcommand.execute?.(interaction);
						} catch (error) {
							console.error(
								`Error handling sub slash command interaction /${interaction.commandName} ${subcommandName}`,
								error
							);
						}
					} else if (isAutocomplete) {
						const focusedOption = interaction.options.getFocused(true);
						const autocompleteCallback =
							subcommand.autocomplete?.[focusedOption.name];

						try {
							await autocompleteCallback?.(interaction);
						} catch (error) {
							console.error(
								`Error handling autocomplete interaction /${interaction.commandName} ${subcommandName} ${focusedOption.name}:${focusedOption.value}…`,
								error
							);
						}
					}
				}
			}
		} else if (isContextMenu) {
			const command = contextMenuCommands.get(interaction.commandName);

			if (!command) {
				throw new Error(
					`Context Menu command '${interaction.commandName}' not found.`
				);
			}

			try {
				await command.execute?.(interaction);
			} catch (error) {
				console.error(
					`Error handling context menu interaction ${inspect(interaction)}`,
					error
				);
			}
		}
	});
	// #endregion Commands

	// #region Events
	for (const module of Object.values(modules)) {
		if (!module.events) {
			continue;
		}

		for (const event of module.events) {
			discordClient[event.once ? 'once' : 'on'](
				event.name,
				event.execute.bind(null)
			);
		}
	}
	// #endregion Events
});
