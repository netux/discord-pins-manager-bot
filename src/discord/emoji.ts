import type { FormatEmojiOptions } from '@discordjs/formatters';

type Emoji = FormatEmojiOptions<string, string>;

export const BUSY_EMOJI = {
	name: 'busy',
	id: '1392559140638953603',
	animated: true,
} satisfies FormatEmojiOptions<string, string>;

export const DONE_EMOJI = '✅';
