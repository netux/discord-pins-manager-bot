import { setInterval } from 'node:timers';
import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	InteractionEditReplyOptions,
	InteractionReplyOptions,
	MessageActionRowComponentBuilder,
	MessagePayload,
	Snowflake,
} from 'discord.js';
import { ActionRowBuilder } from 'discord.js';
import type { ButtonId, ButtonInteractionHandler } from '../../model';
import type { ButtonBuilder } from './button';
import { buttonId, onButtonInteraction } from './button';

type ButtonInteractionHandlerWithButton = ButtonInteractionHandler & {
	button: ButtonBuilder;
};

export const rerender = Symbol('rerender');

type CommonFields<A, B> = {
	[K in Extract<keyof A, keyof B>]: A[K];
};

export type RerenderFn = (
	reason: ButtonInteraction | null,
	menuSession: InteractionMenuSession
) => Promise<
	Partial<
		Omit<
			CommonFields<InteractionReplyOptions, InteractionEditReplyOptions>,
			'components'
		>
	>
>;

/**
 * Reactive-like interface for creating menus
 */
export class InteractionMenuSession {
	static DEFAULT_EXPIRY_MS = 14 * 60 * 1_000;

	readonly activeButtonInteractionHandlers: Set<ButtonInteractionHandlerWithButton> =
		new Set();

	readonly #rerenderFn: RerenderFn;

	#sessionId = Date.now();

	public get sessionId() {
		return this.#sessionId;
	}

	#started = false;

	#expired = false;

	public get expired() {
		return this.#expired;
	}

	#currentRerenderActionRow: ActionRowBuilder<MessageActionRowComponentBuilder>;

	constructor(
		public readonly interaction: ChatInputCommandInteraction,
		rerender: RerenderFn,
		public readonly ephemeral: boolean,
		public readonly expiryMs = InteractionMenuSession.DEFAULT_EXPIRY_MS
	) {
		this.#rerenderFn = rerender;
	}

	async start() {
		if (this.#started) {
			return;
		}

		setInterval(async () => {
			this.#expired = true;

			for (const { button } of this.activeButtonInteractionHandlers) {
				button.setDisabled(true);
			}

			this.#removeAllButtonInteractionHandlers();

			await this.#doRerender(null);
		}, this.expiryMs);

		await this.#doRerender(null);
		this.#started = true;
	}

	async #doRerender(reason: ButtonInteraction | null) {
		this.#currentRerenderActionRow =
			new ActionRowBuilder<MessageActionRowComponentBuilder>();

		this.#removeAllButtonInteractionHandlers();

		const renderPayload = await this.#rerenderFn(reason, this);

		const replyPayload = {
			...renderPayload,
			components:
				this.#currentRerenderActionRow.components.length > 0
					? [this.#currentRerenderActionRow]
					: [],
		};

		if (this.interaction.replied) {
			await this.interaction.editReply(replyPayload);
		} else {
			await this.interaction.reply({
				...replyPayload,
				ephemeral: this.ephemeral,
			});
		}
	}

	#addButtonInteractionHandler(
		button: ButtonBuilder,
		handler: ButtonInteractionHandler
	) {
		this.activeButtonInteractionHandlers.add({ button, ...handler });
	}

	#removeAllButtonInteractionHandlers() {
		for (const handler of this.activeButtonInteractionHandlers.values()) {
			handler.remove();
		}

		this.activeButtonInteractionHandlers.clear();
	}

	public buttonId<I extends ButtonId<string>>(id: Omit<I, 'session'>): string {
		return buttonId({
			...id,
			session: this.sessionId,
		});
	}

	public onButtonInteraction(setup: {
		button: ButtonBuilder;
		byWho: Snowflake[] | null;
		handle:
			| typeof rerender
			| ((interaction: ButtonInteraction) => Promise<typeof rerender | null>);
	}) {
		const { button, byWho, handle } = setup;

		this.#currentRerenderActionRow.addComponents(button);

		const handler = onButtonInteraction(
			this.interaction.client,
			button,
			async (buttonInteraction) => {
				if (byWho && !byWho.includes(buttonInteraction.user.id)) {
					return;
				}

				const signal =
					typeof handle === 'function'
						? await handle(buttonInteraction)
						: handle;

				switch (signal) {
					case rerender: {
						await buttonInteraction.deferUpdate();
						await this.#doRerender(buttonInteraction);
						break;
					}

					default: {
						await buttonInteraction.deferUpdate();
						break;
					}
				}
			}
		);

		this.#addButtonInteractionHandler(button, handler);
	}

	public guardOnlyByOriginalCommandUser(
		handler: (buttonInteraction: ButtonInteraction) => void
	) {
		return async (buttonInteraction: ButtonInteraction) => {
			if (buttonInteraction.user.id !== this.interaction.user.id) {
				await buttonInteraction.deferUpdate();
				return;
			}

			handler(buttonInteraction);
		};
	}
}

export async function createInteractionMenuSession(
	interaction: ChatInputCommandInteraction,
	rerender: RerenderFn,
	{
		ephemeral = false,
		expiryMs = InteractionMenuSession.DEFAULT_EXPIRY_MS,
	}: { ephemeral?: boolean; expiryMs?: number } = {}
) {
	const interactionMenuSession = new InteractionMenuSession(
		interaction,
		rerender,
		ephemeral,
		expiryMs
	);
	await interactionMenuSession.start();
	return interactionMenuSession;
}
