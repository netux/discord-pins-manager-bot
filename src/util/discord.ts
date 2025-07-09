import {
	SlashCommandBuilder as DiscordJSSlashCommandBuilder,
	ModalBuilder as DiscordJSModalBuilder,
	SlashCommandSubcommandBuilder,
	ContextMenuCommandBuilder as DiscordJSContextMenuCommandBuilder,
	InteractionContextType,
} from 'discord.js';
import type {
	RESTPostAPIChatInputApplicationCommandsJSONBody,
	RESTPostAPIContextMenuApplicationCommandsJSONBody,
	Client as DiscordClient,
	Interaction,
	ModalSubmitInteraction,
} from 'discord.js';
import type {
	SlashCommand,
	ModalId,
	SlashSubcommand,
	ContextMenuCommand,
} from '../model';

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

export class ContextMenuCommandBuilder extends DiscordJSContextMenuCommandBuilder {}

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

export const modalId = (id: ModalId<string>) => JSON.stringify(id, null, 0);

export class ModalBuilder extends DiscordJSModalBuilder {
	setCustomId<M extends ModalId<string>>(customId: M | string): this {
		const id = typeof customId === 'string' ? customId : modalId(customId);
		return super.setCustomId(id);
	}
}

export const waitForModalSubmit = async (
	client: DiscordClient,
	id: ModalId<string> | string
): Promise<ModalSubmitInteraction> => {
	return new Promise((resolve) => {
		const modalCustomId = typeof id === 'string' ? id : modalId(id);

		function handler(interaction: Interaction) {
			if (
				!interaction.isModalSubmit() ||
				interaction.customId !== modalCustomId
			) {
				return;
			}

			client.removeListener('interactionCreate', handler);
			resolve(interaction);
		}

		client.addListener('interactionCreate', handler);
	});
};
