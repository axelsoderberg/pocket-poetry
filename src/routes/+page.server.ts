import { buildDailyWords, DAILY_WORD_COUNT, getUtcDayKey } from '$lib/words/daily';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => {
	const dayKey = getUtcDayKey();
	const words = buildDailyWords(dayKey, DAILY_WORD_COUNT);

	return {
		dayKey,
		words
	};
};
