type CardBounds = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
	centerX: number;
	centerY: number;
};

export type CropRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

const MIN_CARD_DIMENSION = 16;
const CLUSTER_DISTANCE_MULTIPLIER = 2.9;
const CLUSTER_PADDING_MULTIPLIER = 1.1;
const CLUSTER_PADDING_MIN = 28;

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}

function getMedian(values: number[]) {
	if (values.length === 0) {
		return 0;
	}

	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);

	if (sorted.length % 2 === 1) {
		return sorted[middle];
	}

	return (sorted[middle - 1] + sorted[middle]) / 2;
}

function buildCardBounds(cardRects: DOMRect[], containerRect: DOMRect): CardBounds[] {
	return cardRects
		.map((rect) => {
			const left = rect.left - containerRect.left;
			const top = rect.top - containerRect.top;
			const width = rect.width;
			const height = rect.height;
			const right = left + width;
			const bottom = top + height;

			if (width < MIN_CARD_DIMENSION || height < MIN_CARD_DIMENSION) {
				return null;
			}

			return {
				left,
				top,
				right,
				bottom,
				width,
				height,
				centerX: left + width / 2,
				centerY: top + height / 2
			};
		})
		.filter((bounds): bounds is CardBounds => bounds !== null);
}

function getComponentBounds(cards: CardBounds[]) {
	let minLeft = Number.POSITIVE_INFINITY;
	let minTop = Number.POSITIVE_INFINITY;
	let maxRight = Number.NEGATIVE_INFINITY;
	let maxBottom = Number.NEGATIVE_INFINITY;

	for (const card of cards) {
		minLeft = Math.min(minLeft, card.left);
		minTop = Math.min(minTop, card.top);
		maxRight = Math.max(maxRight, card.right);
		maxBottom = Math.max(maxBottom, card.bottom);
	}

	return {
		left: minLeft,
		top: minTop,
		right: maxRight,
		bottom: maxBottom,
		width: Math.max(1, maxRight - minLeft),
		height: Math.max(1, maxBottom - minTop)
	};
}

function splitIntoComponents(cards: CardBounds[]) {
	const diagonals = cards.map((card) => Math.hypot(card.width, card.height));
	const medianDiagonal = getMedian(diagonals);
	const threshold = Math.max(70, medianDiagonal * CLUSTER_DISTANCE_MULTIPLIER);
	const visited = new Set<number>();
	const components: CardBounds[][] = [];

	for (let index = 0; index < cards.length; index += 1) {
		if (visited.has(index)) {
			continue;
		}

		const queue = [index];
		const componentIndices: number[] = [];
		visited.add(index);

		while (queue.length > 0) {
			const current = queue.shift();

			if (current === undefined) {
				continue;
			}

			componentIndices.push(current);
			const source = cards[current];

			for (let compareIndex = 0; compareIndex < cards.length; compareIndex += 1) {
				if (visited.has(compareIndex)) {
					continue;
				}

				const target = cards[compareIndex];
				const distance = Math.hypot(
					source.centerX - target.centerX,
					source.centerY - target.centerY
				);

				if (distance <= threshold) {
					visited.add(compareIndex);
					queue.push(compareIndex);
				}
			}
		}

		components.push(componentIndices.map((componentIndex) => cards[componentIndex]));
	}

	return { components, medianDiagonal };
}

function getLargestClump(cards: CardBounds[]) {
	if (cards.length === 0) {
		return null;
	}

	if (cards.length <= 2) {
		return cards;
	}

	const { components } = splitIntoComponents(cards);
	let best = components[0];
	let bestArea = getComponentBounds(best).width * getComponentBounds(best).height;

	for (let index = 1; index < components.length; index += 1) {
		const current = components[index];

		if (current.length > best.length) {
			best = current;
			bestArea = getComponentBounds(current).width * getComponentBounds(current).height;
			continue;
		}

		if (current.length === best.length) {
			const currentBounds = getComponentBounds(current);
			const currentArea = currentBounds.width * currentBounds.height;

			if (currentArea < bestArea) {
				best = current;
				bestArea = currentArea;
			}
		}
	}

	return best;
}

export function getLargestClumpCrop(cardRects: DOMRect[], containerRect: DOMRect): CropRect | null {
	const cards = buildCardBounds(cardRects, containerRect);

	if (cards.length === 0) {
		return null;
	}

	const clump = getLargestClump(cards);

	if (!clump || clump.length === 0) {
		return null;
	}

	const clumpBounds = getComponentBounds(clump);
	const allBounds = getComponentBounds(cards);
	const diagonalMedian = getMedian(clump.map((card) => Math.hypot(card.width, card.height)));
	const padding = Math.max(CLUSTER_PADDING_MIN, diagonalMedian * CLUSTER_PADDING_MULTIPLIER);

	const expandedLeft = clamp(clumpBounds.left - padding, 0, containerRect.width);
	const expandedTop = clamp(clumpBounds.top - padding, 0, containerRect.height);
	const expandedRight = clamp(clumpBounds.right + padding, 0, containerRect.width);
	const expandedBottom = clamp(clumpBounds.bottom + padding, 0, containerRect.height);

	const expandedWidth = expandedRight - expandedLeft;
	const expandedHeight = expandedBottom - expandedTop;

	if (expandedWidth < 40 || expandedHeight < 40) {
		return {
			x: clamp(allBounds.left, 0, containerRect.width),
			y: clamp(allBounds.top, 0, containerRect.height),
			width: clamp(allBounds.width, 1, containerRect.width),
			height: clamp(allBounds.height, 1, containerRect.height)
		};
	}

	return {
		x: expandedLeft,
		y: expandedTop,
		width: expandedWidth,
		height: expandedHeight
	};
}
