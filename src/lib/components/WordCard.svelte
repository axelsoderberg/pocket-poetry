<script lang="ts" module>
	let highestZIndex = 0;

	function getNextZIndex() {
		highestZIndex += 1;
		return highestZIndex;
	}
</script>

<script lang="ts">
	let {
		text,
		x: propX = 20,
		y: propY = 20,
		wordBox: propWordBox = null
	}: {
		text: string;
		x?: number;
		y?: number;
		wordBox?: HTMLElement | null;
	} = $props();

	let cardX = $state(20);
	let cardY = $state(20);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let isInWordBox = $state(false);
	let hasInitialized = $state(false);
	let zIndex = $state(getNextZIndex());
	let rotation = $state(0);
	let shadowOffset = getRandomShadowOffset(2);
	let cardElement = $state<HTMLDivElement | null>(null);
	let positionPercentInWordBox = $state<{ x: number; y: number } | null>(null);
	const WORD_BOX_MARGIN = 8;

	$effect(() => {
		if (hasInitialized) {
			return;
		}

		cardX = propX;
		cardY = propY;
		hasInitialized = true;
		updateWordBoxState();

		if (isInWordBox) {
			updatePositionPercent();
		}
	});

	function getPlacementBounds() {
		const wordBox = propWordBox;

		if (!wordBox || !cardElement) {
			return null;
		}

		const wordBoxRect = wordBox.getBoundingClientRect();
		const cardWidth = cardElement.offsetWidth;
		const cardHeight = cardElement.offsetHeight;

		return {
			wordBoxRect,
			cardWidth,
			cardHeight,
			minX: wordBoxRect.left + WORD_BOX_MARGIN,
			maxX: wordBoxRect.right - cardWidth - WORD_BOX_MARGIN,
			minY: wordBoxRect.top + WORD_BOX_MARGIN,
			maxY: wordBoxRect.bottom - cardHeight - WORD_BOX_MARGIN
		};
	}

	function isBoundsRangeInvalid(bounds: NonNullable<ReturnType<typeof getPlacementBounds>>) {
		return bounds.maxX < bounds.minX || bounds.maxY < bounds.minY;
	}

	function setCardXWithinBounds(bounds: NonNullable<ReturnType<typeof getPlacementBounds>>) {
		if (bounds.maxX < bounds.minX) {
			cardX = bounds.wordBoxRect.left + (bounds.wordBoxRect.width - bounds.cardWidth) / 2;
			return;
		}

		cardX = clamp(cardX, bounds.minX, bounds.maxX);
	}

	function setCardYWithinBounds(bounds: NonNullable<ReturnType<typeof getPlacementBounds>>) {
		if (bounds.maxY < bounds.minY) {
			cardY = bounds.wordBoxRect.top + (bounds.wordBoxRect.height - bounds.cardHeight) / 2;
			return;
		}

		cardY = clamp(cardY, bounds.minY, bounds.maxY);
	}

	function updateWordBoxState(bounds = getPlacementBounds()) {
		if (!bounds) {
			isInWordBox = false;
			return false;
		}

		if (isBoundsRangeInvalid(bounds)) {
			isInWordBox = false;
			return false;
		}

		isInWordBox =
			cardX >= bounds.minX && cardX <= bounds.maxX && cardY >= bounds.minY && cardY <= bounds.maxY;

		return isInWordBox;
	}

	function clamp(value: number, min: number, max: number) {
		return Math.min(Math.max(value, min), max);
	}

	function updatePositionPercent(bounds = getPlacementBounds()) {
		if (!bounds) {
			return;
		}

		const xPercent =
			bounds.maxX <= bounds.minX
				? 0.5
				: clamp((cardX - bounds.minX) / (bounds.maxX - bounds.minX), 0, 1);
		const yPercent =
			bounds.maxY <= bounds.minY
				? 0.5
				: clamp((cardY - bounds.minY) / (bounds.maxY - bounds.minY), 0, 1);

		positionPercentInWordBox = { x: xPercent, y: yPercent };
	}

	function applyPositionPercentAfterResize() {
		if (!positionPercentInWordBox || isDragging) {
			return;
		}

		const bounds = getPlacementBounds();

		if (!bounds) {
			return;
		}

		if (bounds.maxX >= bounds.minX) {
			cardX = bounds.minX + (bounds.maxX - bounds.minX) * positionPercentInWordBox.x;
		}

		if (bounds.maxY >= bounds.minY) {
			cardY = bounds.minY + (bounds.maxY - bounds.minY) * positionPercentInWordBox.y;
		}

		setCardXWithinBounds(bounds);
		setCardYWithinBounds(bounds);

		updateWordBoxState(bounds);
	}

	function moveInsideWordBoxIfNeeded(bounds = getPlacementBounds()) {
		if (!bounds) {
			return;
		}

		const cardRight = cardX + bounds.cardWidth;
		const cardBottom = cardY + bounds.cardHeight;

		const overlapsWordBox =
			cardRight > bounds.wordBoxRect.left &&
			cardX < bounds.wordBoxRect.right &&
			cardBottom > bounds.wordBoxRect.top &&
			cardY < bounds.wordBoxRect.bottom;

		if (!overlapsWordBox) {
			return;
		}

		setCardXWithinBounds(bounds);
		setCardYWithinBounds(bounds);
	}

	function getRandomRotation() {
		return Math.round((Math.random() * 6 - 3) * 100) / 100;
	}

	function getRandomShadowOffset(baseOffset: number) {
		return Math.round((baseOffset + (Math.random() * 0.8 - 0.4)) * 100) / 100;
	}

	function onMouseMove(event: MouseEvent) {
		cardX = event.clientX - offsetX;
		cardY = event.clientY - offsetY;
	}

	function onMouseUp() {
		isDragging = false;
		const bounds = getPlacementBounds();
		moveInsideWordBoxIfNeeded(bounds);
		const insideWordBox = updateWordBoxState(bounds);

		if (insideWordBox) {
			updatePositionPercent(bounds);
		} else {
			positionPercentInWordBox = null;
		}

		window.removeEventListener('mousemove', onMouseMove);
		window.removeEventListener('mouseup', onMouseUp);
	}

	function onMouseDown(event: MouseEvent) {
		isDragging = true;
		zIndex = getNextZIndex();
		rotation = getRandomRotation();
		offsetX = event.clientX - cardX;
		offsetY = event.clientY - cardY;
		updateWordBoxState();
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}

	$effect(() => {
		if (!propWordBox || typeof ResizeObserver === 'undefined') {
			return;
		}

		const resizeObserver = new ResizeObserver(() => {
			applyPositionPercentAfterResize();
		});

		resizeObserver.observe(propWordBox);

		return () => {
			resizeObserver.disconnect();
		};
	});
</script>

<div
	bind:this={cardElement}
	class="word-card"
	class:moving={isDragging}
	class:in-word-box={isInWordBox}
	onmousedown={onMouseDown}
	role="button"
	tabindex="0"
	style={`left: ${cardX}px; top: ${cardY}px; z-index: ${zIndex}; --shadow-near: ${shadowOffset}px; transform: rotate(${rotation}deg) ${isDragging ? 'scale(1.04)' : ''};`}
>
	{text}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap');

	.word-card {
		position: absolute;
		user-select: none;
		cursor: grab;
		padding: 0.3rem 0.5rem;
		font-size: large;
		font-family: 'Merriweather', Georgia, 'Times New Roman', Times, serif;
		background-color: #fff;
		border: 1px solid #1e1e1e;
		transition: transform 0.2s ease;
		box-shadow: #1e1e1e var(--shadow-near) var(--shadow-near) 0px;
	}

	.word-card.moving {
		cursor: grabbing;
		transition: transform 0.2s ease;
	}

	.word-card.in-word-box {
		background-color: #3b82f6;
		color: #fff;
	}
</style>
