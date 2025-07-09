import { ModalBuilder as DiscordJSModalBuilder } from 'discord.js';
import type {
	Client as DiscordClient,
	Interaction,
	ModalSubmitInteraction,
} from 'discord.js';
import type { ModalId } from '../../model';

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

		function listener(interaction: Interaction) {
			if (
				!interaction.isModalSubmit() ||
				interaction.customId !== modalCustomId
			) {
				return;
			}

			client.removeListener('interactionCreate', listener);
			resolve(interaction);
		}

		client.addListener('interactionCreate', listener);
	});
};
