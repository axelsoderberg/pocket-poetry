import { contentWords, utilityTokens } from '$lib/words/pool';

export const DAILY_WORD_COUNT = 42;
const UTILITY_WORD_TARGET = 12;

export function getUtcDayKey(date = new Date()) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function hashStringToSeed(input: string) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function createRng(seed: number) {
	let state = seed;
	return () => {
		state += 0x6d2b79f5;
		let result = Math.imul(state ^ (state >>> 15), 1 | state);
		result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
		return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
	};
}

function shuffleDeterministically<T>(items: T[], seedKey: string) {
	const shuffled = [...items];
	const rng = createRng(hashStringToSeed(seedKey));
	for (let index = shuffled.length - 1; index > 0; index -= 1) {
		const randomIndex = Math.floor(rng() * (index + 1));
		[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
	}
	return shuffled;
}

function pickUnique(items: readonly string[], count: number, seedKey: string) {
	const uniqueItems = Array.from(new Set(items));
	return shuffleDeterministically(uniqueItems, seedKey).slice(0, count);
}

export function buildDailyWords(dayKey: string, count = DAILY_WORD_COUNT) {
	const utilitySet = new Set<string>(utilityTokens);
	const filteredContent = contentWords.filter((word) => !utilitySet.has(word));

	const utilityCount = Math.min(UTILITY_WORD_TARGET, utilityTokens.length, count);
	const contentCount = Math.max(0, count - utilityCount);

	const selectedUtility = pickUnique(utilityTokens, utilityCount, `${dayKey}:utility`);
	const selectedContent = pickUnique(filteredContent, contentCount, `${dayKey}:content`);

	const combined = [...selectedContent, ...selectedUtility];
	if (combined.length < count) {
		const usedWords = new Set(combined);
		const remaining = [...filteredContent, ...utilityTokens].filter((word) => !usedWords.has(word));
		const fill = pickUnique(remaining, count - combined.length, `${dayKey}:fill`);
		combined.push(...fill);
	}

	return shuffleDeterministically(combined, `${dayKey}:final`).slice(0, count);
}
