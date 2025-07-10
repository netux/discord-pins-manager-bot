import { ButtonBuilder as DiscordJSButtonBuilder } from 'discord.js';
import type {
	Client as DiscordClient,
	Interaction,
	ButtonInteraction,
} from 'discord.js';
import type { ButtonId, ButtonInteractionHandler } from '../../model';

export const buttonId = (id: ButtonId<string>) => JSON.stringify(id, null, 0);

export class ButtonBuilder extends DiscordJSButtonBuilder {
	#customId: string;

	setCustomId<B extends ButtonId<string>>(customId: B | string): this {
		const id = typeof customId === 'string' ? customId : buttonId(customId);
		this.#customId = id;
		return super.setCustomId(id);
	}

	getCustomId(): string {
		return this.#customId;
	}
}

const coalesceButtonId = (
	input: ButtonBuilder | ButtonId<string> | string
): string => {
	if (typeof input === 'string') {
		return input;
	}

	if (input instanceof ButtonBuilder) {
		return input.getCustomId();
	}

	return buttonId(input);
};

export const waitForButtonInteraction = async (
	client: DiscordClient,
	id: ButtonBuilder | ButtonId<string> | string
): Promise<ButtonInteraction> => {
	return new Promise((resolve) => {
		const buttonCustomId = coalesceButtonId(id);

		function listener(interaction: Interaction) {
			if (!interaction.isButton() || interaction.customId !== buttonCustomId) {
				return;
			}

			client.removeListener('interactionCreate', listener);
			resolve(interaction);
		}

		client.addListener('interactionCreate', listener);
	});
};

/* eslint-disable promise/prefer-await-to-callbacks */
export const onButtonInteraction = (
	client: DiscordClient,
	id: ButtonBuilder | ButtonId<string> | string,
	handle: (interaction: ButtonInteraction) => void
): ButtonInteractionHandler => {
	const buttonCustomId = coalesceButtonId(id);

	function listener(interaction: Interaction) {
		if (interaction.isButton() && interaction.customId === buttonCustomId) {
			handle(interaction);
		}
	}

	client.addListener('interactionCreate', listener);

	return {
		remove() {
			client.removeListener('interactionCreate', listener);
		},
	};
};
/* eslint-enable promise/prefer-await-to-callbacks */
