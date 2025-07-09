import process from 'node:process';
import { API } from '@discordjs/core/http-only';
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	REST,
} from 'discord.js';
import getModules from '../modules';
import {
	getContextMenuCommandRESTPostAPIData,
	getSlashCommandRESTPostAPIData,
} from '../util/discord';

void (async () => {
	const modules = Object.values(
		// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
		// @ts-ignore
		getModules({ discordClient: null /* TODO(netux): !!! */ })
	);
	const slashCommands = modules.flatMap((module) => module.slashCommands ?? []);
	const contextMenuCommands = modules.flatMap(
		(module) => module.contextMenuCommands ?? []
	);
	const commandsData = [
		...Array.from(slashCommands.values()).map((command) =>
			getSlashCommandRESTPostAPIData(command)
		),
		...Array.from(contextMenuCommands.values()).map((command) =>
			getContextMenuCommandRESTPostAPIData(command)
		),
	];

	const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
	const api = new API(rest);

	const result = await api.applicationCommands.bulkOverwriteGlobalCommands(
		process.env.APPLICATION_ID!,
		commandsData
	);

	const slashCommandsCreated = result.filter(
		(command) => command.type === ApplicationCommandType.ChatInput
	);
	console.log(
		`Successfully registered ${slashCommandsCreated.length} slash command(s):\n` +
			slashCommandsCreated
				.map((commandData) => {
					const subcommands =
						commandData.options?.filter(
							(option) =>
								option.type === ApplicationCommandOptionType.Subcommand
						) ?? [];
					return (
						`- ${commandData.name} (${commandData.id})` +
						(subcommands.length > 0
							? '\n' +
								subcommands
									.map((subcommandData) => `  - ${subcommandData.name}`)
									.join('\n')
							: '')
					);
				})
				.join('\n')
	);

	const contextMenuCommandsCreated = result.filter(
		(command) => command.type !== ApplicationCommandType.ChatInput
	);
	console.log(
		`Successfully registered ${contextMenuCommandsCreated.length} context menu command(s):\n` +
			contextMenuCommandsCreated
				.map((commandData) => {
					const subcommands =
						commandData.options?.filter(
							(option) =>
								option.type === ApplicationCommandOptionType.Subcommand
						) ?? [];
					return (
						`- ${commandData.name} (${commandData.id})` +
						(subcommands.length > 0
							? '\n' +
								subcommands
									.map((subcommandData) => `  - ${subcommandData.name}`)
									.join('\n')
							: '')
					);
				})
				.join('\n')
	);
})();
