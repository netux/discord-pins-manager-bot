import type {
	AutocompleteInteraction,
	ClientEvents,
	CommandInteraction,
	ContextMenuCommandInteraction,
	SlashCommandOptionsOnlyBuilder,
	SlashCommandSubcommandBuilder,
} from 'discord.js';
import type {
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
} from './util/discord';

export type Event<E extends keyof ClientEvents = keyof ClientEvents> = {
	/**
	 * The function to execute when the event is emitted.
	 *
	 * @param parameters - The parameters of the event
	 */
	execute(...parameters: ClientEvents[E]): Promise<void> | void;
	/**
	 * The name of the event to listen to
	 */
	name: E;
	/**
	 * Whether or not the event should only be listened to once
	 *
	 * @defaultValue false
	 */
	once?: boolean;
};

export type ICommand<I extends CommandInteraction = CommandInteraction> = {
	/**
	 * Functions to execute when autocomplete is requested
	 */
	autocomplete?: {
		[optionName: string]: (
			interaction: AutocompleteInteraction
		) => Promise<void> | void;
	};

	/**
	 * The function to execute when the command is called
	 *
	 * @param interaction - The interaction of the command
	 */
	execute?(interaction: I): Promise<void> | void;
};

export type SlashCommand<I extends CommandInteraction = CommandInteraction> =
	ICommand<I> & {
		/**
		 * The data for the command
		 */
		data(command: SlashCommandBuilder):
			| SlashCommandBuilder
			// SlashCommandBuilder might become a SlashCommandOptionsOnlyBuilder when builder.addXYZOption() is called
			| SlashCommandOptionsOnlyBuilder;
		/**
		 * The {@link SlashSubcommand}s available under this command
		 */
		subcommands?: Map<string, SlashSubcommand<I>>;
	};

export type SlashSubcommand<I extends CommandInteraction = CommandInteraction> =
	ICommand<I> & {
		data(
			subcommand: SlashCommandSubcommandBuilder
		): SlashCommandSubcommandBuilder;
	};

export type ContextMenuCommand<
	I extends ContextMenuCommandInteraction = ContextMenuCommandInteraction,
> = ICommand<I> & {
	/**
	 * The data for the command
	 */
	data(command: ContextMenuCommandBuilder): ContextMenuCommandBuilder;
};

export type ModalId<T extends string> = {
	timestamp: number;
	type: T;
};

export type ButtonId<T extends string> = {
	session: number;
	type: T;
};

export type ButtonInteractionHandler = { remove(): void };

export type Module = {
	readonly contextMenuCommands?: ContextMenuCommand[];
	readonly events?: Event[];
	readonly slashCommands?: SlashCommand[];
};
