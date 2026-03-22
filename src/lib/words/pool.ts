import standardWordSource from './google-10000-english-no-swears.txt?raw';

const splitStandardWords = standardWordSource
	.split(/\r?\n/)
	.map((word) => word.trim().toLowerCase())
	.filter(Boolean);

export const contentWords = Array.from(new Set(splitStandardWords));

export const utilityTokens = [
	'a',
	'an',
	'the',
	'and',
	'or',
	'but',
	'if',
	'then',
	'to',
	'of',
	'in',
	'on',
	'at',
	'for',
	'with',
	'from',
	'by',
	'as',
	'is',
	'are',
	'was',
	'were',
	'be',
	'not',
	'er',
	's',
	'!',
	'?',
	'...'
] as const;
