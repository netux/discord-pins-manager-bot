import type {
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
} from 'discord.js';
import {
	ApplicationIntegrationType,
	SlashCommandBuilder as DiscordJSSlashCommandBuilder,
	SlashCommandSubcommandBuilder,
	ContextMenuCommandBuilder as DiscordJSContextMenuCommandBuilder,
	InteractionContextType,
} from 'discord.js';
import type {
	SlashCommand,
	SlashSubcommand,
	ContextMenuCommand,
} from '../../model';

export class SlashCommandBuilder extends DiscordJSSlashCommandBuilder {
	canBeUsedAnywhere() {
		this.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		]);
		return this;
	}

	toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody {
		if (!this.description) {
			throw new Error('Missing description');
		}

		return super.toJSON();
	}
}

export class ContextMenuCommandBuilder extends DiscordJSContextMenuCommandBuilder {
	// eslint-disable-next-line sonarjs/no-identical-functions
	canBeUsedAnywhere() {
		this.setContexts([
			InteractionContextType.Guild,
			InteractionContextType.BotDM,
			InteractionContextType.PrivateChannel,
		]);
		return this;
	}
}

export const getSlashCommandRESTPostAPIData = (
	command: SlashCommand
): RESTPostAPIChatInputApplicationCommandsJSONBody => {
	type IHasToRestPostAPIJSONBody = {
		toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody;
	};

	let builder: IHasToRestPostAPIJSONBody = command.data(
		new SlashCommandBuilder()
	);
	if (builder instanceof SlashCommandBuilder) {
		for (const subcommand of command.subcommands?.values() ?? []) {
			builder = (builder as SlashCommandBuilder).addSubcommand(
				(subcommandBuilder) => subcommand.data(subcommandBuilder)
			);
		}
	}

	return builder.toJSON();
};

export const slashSubCommandsMap = (
	subcommands: SlashSubcommand[]
): Map<string, SlashSubcommand> =>
	new Map(
		subcommands.map((subcommand) => {
			const { name: subcommandName } = subcommand.data(
				new SlashCommandSubcommandBuilder()
			);
			return [subcommandName, subcommand];
		})
	);

export const getContextMenuCommandRESTPostAPIData = (
	command: ContextMenuCommand
): RESTPostAPIContextMenuApplicationCommandsJSONBody => {
	type IHasToRestPostAPIJSONBody = {
		toJSON(): RESTPostAPIContextMenuApplicationCommandsJSONBody;
	};

	const builder: IHasToRestPostAPIJSONBody = command.data(
		new ContextMenuCommandBuilder()
	);

	return builder.toJSON();
};
