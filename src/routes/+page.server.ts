import { buildDailyWords, DAILY_WORD_COUNT, getUtcDayKey } from '$lib/words/daily';
import type { PageServerLoad } from './$types';

const RELEASE_DAY_KEY = '2026-03-22';
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseUtcDayKey(dayKey: string) {
	const [year, month, day] = dayKey.split('-').map(Number);

	if (!year || !month || !day) {
		throw new Error(`Invalid day key: ${dayKey}`);
	}

	return Date.UTC(year, month - 1, day);
}

function getReleaseDayNumber(dayKey: string, releaseDayKey: string) {
	const currentUtc = parseUtcDayKey(dayKey);
	const releaseUtc = parseUtcDayKey(releaseDayKey);
	const dayDiff = Math.floor((currentUtc - releaseUtc) / MS_PER_DAY);

	return Math.max(1, dayDiff + 1);
}

export const load: PageServerLoad = () => {
	const dayKey = getUtcDayKey();
	const dayNumber = getReleaseDayNumber(dayKey, RELEASE_DAY_KEY);
	const words = buildDailyWords(dayKey, DAILY_WORD_COUNT);

	return {
		dayNumber,
		dayKey,
		words
	};
};
