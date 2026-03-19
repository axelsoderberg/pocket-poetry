<script lang="ts" module>
	let highestZIndex = 0;

	function getNextZIndex() {
		highestZIndex += 1;
		return highestZIndex;
	}
</script>

<script lang="ts">
	type HoveredCard = {
		id: string;
		centerX: number;
		centerY: number;
	};

	let {
		cardId,
		text,
		x: propX = 20,
		y: propY = 20,
		wordBox: propWordBox = null,
		hoveredCard = null,
		onHoverInBox,
		onLeaveInBox
	}: {
		cardId: string;
		text: string;
		x?: number;
		y?: number;
		wordBox?: HTMLElement | null;
		hoveredCard?: HoveredCard | null;
		onHoverInBox?: (detail: HoveredCard) => void;
		onLeaveInBox?: (cardId: string) => void;
	} = $props();

	let cardX = $state(20);
	let cardY = $state(20);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let isDragging = $state(false);
	let isInWordBox = $state(false);
	let hasInitialized = $state(false);
	let zIndex = $state(getNextZIndex());
	let rotation = $state(getRandomRotation());
	let hoverOffsetX = $state(0);
	let hoverOffsetY = $state(0);
	let shadowOffset = getRandomShadowOffset(2);
	let cardElement = $state<HTMLDivElement | null>(null);
	let positionPercentInWordBox = $state<{ x: number; y: number } | null>(null);
	const WORD_BOX_MARGIN = 8;
	const HOVER_PUSH_RADIUS = 140;
	const HOVER_PUSH_MAX = 20;
	const HOVER_CLOSE_BOOST_RANGE = 56;
	const HOVER_CLOSE_BOOST_MAX = 16;

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

	function getCardCenter() {
		if (!cardElement) {
			return null;
		}

		return {
			x: cardX + cardElement.offsetWidth / 2,
			y: cardY + cardElement.offsetHeight / 2
		};
	}

	function getStableDirectionFromIds(sourceId: string, targetId: string) {
		const seed = `${sourceId}:${targetId}`;
		let hash = 0;

		for (let index = 0; index < seed.length; index += 1) {
			hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
		}

		const angle = (hash % 360) * (Math.PI / 180);

		return {
			x: Math.cos(angle),
			y: Math.sin(angle)
		};
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

	function onMouseEnter() {
		if (!isInWordBox || isDragging) {
			return;
		}

		const center = getCardCenter();

		if (!center) {
			return;
		}

		onHoverInBox?.({
			id: cardId,
			centerX: center.x,
			centerY: center.y
		});
	}

	function onMouseLeave() {
		onLeaveInBox?.(cardId);
	}

	$effect(() => {
		if (!hoveredCard || hoveredCard.id === cardId || !isInWordBox || isDragging) {
			hoverOffsetX = 0;
			hoverOffsetY = 0;
			return;
		}

		const center = getCardCenter();

		if (!center) {
			hoverOffsetX = 0;
			hoverOffsetY = 0;
			return;
		}

		const deltaX = center.x - hoveredCard.centerX;
		const deltaY = center.y - hoveredCard.centerY;
		const distance = Math.hypot(deltaX, deltaY);

		if (distance > HOVER_PUSH_RADIUS) {
			hoverOffsetX = 0;
			hoverOffsetY = 0;
			return;
		}

		const closeness = 1 - distance / HOVER_PUSH_RADIUS;
		const closeBoost =
			distance >= HOVER_CLOSE_BOOST_RANGE
				? 0
				: (1 - distance / HOVER_CLOSE_BOOST_RANGE) * HOVER_CLOSE_BOOST_MAX;
		const intensity = closeness * HOVER_PUSH_MAX + closeBoost;

		const direction = distance < 0.001 ? getStableDirectionFromIds(cardId, hoveredCard.id) : null;
		const normalizedX = direction ? direction.x : deltaX / distance;
		const normalizedY = direction ? direction.y : deltaY / distance;

		hoverOffsetX = normalizedX * intensity;
		hoverOffsetY = normalizedY * intensity;
	});

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
	onmousedown={onMouseDown}
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
	role="button"
	tabindex="0"
	style={`left: ${cardX}px; top: ${cardY}px; z-index: ${zIndex}; --shadow-near: ${shadowOffset}px; translate: ${hoverOffsetX}px ${hoverOffsetY}px; transform: rotate(${rotation}deg) ${isDragging ? 'scale(1.04)' : ''};`}
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
		transition:
			transform 0.2s ease,
			translate 0.35s ease-in-out;
		box-shadow: #1e1e1e var(--shadow-near) var(--shadow-near) 0px;
	}

	.word-card.moving {
		cursor: grabbing;
		transition: transform 0.2s ease;
	}
</style>
