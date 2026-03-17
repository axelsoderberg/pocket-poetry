export type PositionedWord = {
	id: string;
	text: string;
	x: number;
	y: number;
};

type PlacementCandidate = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type PlacementRange = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

const BOX_PADDING = 10;
const ESTIMATED_CARD_HEIGHT = 42;
const MIN_CANDIDATE_SAMPLES = 20;
const BASE_CANDIDATE_SAMPLES = 12;
const PER_WORD_CANDIDATE_SAMPLES = 2;
const OVERLAP_PENALTY_FACTOR = 0.2;

function estimateCardWidth(word: string) {
	return Math.max(72, word.length * 11 + 26);
}

function randomBetween(min: number, max: number) {
	return min + Math.random() * (max - min);
}

function getPlacementRange(rect: DOMRect, width: number): PlacementRange {
	const minX = rect.left + BOX_PADDING;
	const maxX = rect.right - width - BOX_PADDING;
	const minY = rect.top + BOX_PADDING;
	const maxY = rect.bottom - ESTIMATED_CARD_HEIGHT - BOX_PADDING;

	return {
		minX,
		maxX,
		minY,
		maxY
	};
}

function isRangeCollapsed(range: PlacementRange) {
	return range.maxX <= range.minX || range.maxY <= range.minY;
}

function getCenteredCandidate(range: PlacementRange, width: number): PlacementCandidate {
	return {
		x: (range.minX + range.maxX) / 2,
		y: (range.minY + range.maxY) / 2,
		width,
		height: ESTIMATED_CARD_HEIGHT
	};
}

function sampleCandidatePosition(range: PlacementRange, width: number): PlacementCandidate {
	return {
		x: randomBetween(range.minX, range.maxX),
		y: randomBetween(range.minY, range.maxY),
		width,
		height: ESTIMATED_CARD_HEIGHT
	};
}

function scoreCandidate(candidate: PlacementCandidate, placed: PlacementCandidate[]) {
	if (placed.length === 0) {
		return Number.POSITIVE_INFINITY;
	}

	const candidateCenterX = candidate.x + candidate.width / 2;
	const candidateCenterY = candidate.y + candidate.height / 2;
	let nearestScore = Number.POSITIVE_INFINITY;

	for (const existing of placed) {
		const existingCenterX = existing.x + existing.width / 2;
		const existingCenterY = existing.y + existing.height / 2;
		const centerDistance = Math.hypot(
			candidateCenterX - existingCenterX,
			candidateCenterY - existingCenterY
		);

		const overlapX = Math.max(
			0,
			(candidate.width + existing.width) / 2 - Math.abs(candidateCenterX - existingCenterX)
		);
		const overlapY = Math.max(
			0,
			(candidate.height + existing.height) / 2 - Math.abs(candidateCenterY - existingCenterY)
		);
		const overlapPenalty = overlapX * overlapY;
		const score = centerDistance - overlapPenalty * OVERLAP_PENALTY_FACTOR;

		if (score < nearestScore) {
			nearestScore = score;
		}
	}

	return nearestScore;
}

export function buildInitialWordPositions(
	wordList: string[],
	wordBox: HTMLElement
): PositionedWord[] {
	const rect = wordBox.getBoundingClientRect();

	if (wordList.length === 0) {
		return [];
	}

	const candidateCount = Math.max(
		MIN_CANDIDATE_SAMPLES,
		BASE_CANDIDATE_SAMPLES + wordList.length * PER_WORD_CANDIDATE_SAMPLES
	);
	const placed: PlacementCandidate[] = [];
	const result: PositionedWord[] = [];

	for (let index = 0; index < wordList.length; index += 1) {
		const text = wordList[index];
		const width = estimateCardWidth(text);
		const range = getPlacementRange(rect, width);
		const rangeCollapsed = isRangeCollapsed(range);
		let best = rangeCollapsed
			? getCenteredCandidate(range, width)
			: sampleCandidatePosition(range, width);
		let bestScore = scoreCandidate(best, placed);

		if (!rangeCollapsed) {
			for (let sample = 1; sample < candidateCount; sample += 1) {
				const candidate = sampleCandidatePosition(range, width);
				const score = scoreCandidate(candidate, placed);

				if (score > bestScore) {
					best = candidate;
					bestScore = score;
				}
			}
		}

		result.push({
			id: `${text}-${index}`,
			text,
			x: best.x,
			y: best.y
		});
		placed.push(best);
	}

	return result;
}
