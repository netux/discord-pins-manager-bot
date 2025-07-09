export const ellipsis = (text: string, maxLength: number, ellipsis = '…') => {
	const maxTotalLength = maxLength - ellipsis.length;
	return text.length > maxTotalLength
		? text.slice(0, Math.max(0, maxTotalLength)) + ellipsis
		: text;
};

export const unembedLinks = (text: string) =>
	// eslint-disable-next-line prefer-named-capture-group
	text.replaceAll(/(https?:\/\/[^\s)]+)/g, '<$1>');
