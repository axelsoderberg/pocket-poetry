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
		panX = 0,
		panY = 0,
		isPanning = false,
		wordBox: propWordBox = null,
		hoveredCard = null,
		onHoverInBox,
		onLeaveInBox
	}: {
		cardId: string;
		text: string;
		x?: number;
		y?: number;
		panX?: number;
		panY?: number;
		isPanning?: boolean;
		wordBox?: HTMLElement | null;
		hoveredCard?: HoveredCard | null;
		onHoverInBox?: (detail: HoveredCard) => void;
		onLeaveInBox?: (cardId: string) => void;
	} = $props();

	let cardX = $state(20);
	let cardY = $state(20);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let activePointerId = $state<number | null>(null);
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
	let previousPanX = $state(0);
	let previousPanY = $state(0);
	const WORD_BOX_MARGIN = 8;
	const HOVER_PUSH_RADIUS = 140;
	const HOVER_PUSH_MAX = 20;
	const HOVER_CLOSE_BOOST_RANGE = 56;
	const HOVER_CLOSE_BOOST_MAX = 16;
	const WORD_BOX_LAYER_Z = 500;
	const IN_BOX_Z_OFFSET = 200;

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
		const worldWordBoxRect = {
			left: wordBoxRect.left + panX,
			right: wordBoxRect.right + panX,
			top: wordBoxRect.top + panY,
			bottom: wordBoxRect.bottom + panY,
			width: wordBoxRect.width,
			height: wordBoxRect.height
		};
		const cardWidth = cardElement.offsetWidth;
		const cardHeight = cardElement.offsetHeight;

		return {
			wordBoxRect: worldWordBoxRect,
			cardWidth,
			cardHeight,
			minX: worldWordBoxRect.left + WORD_BOX_MARGIN,
			maxX: worldWordBoxRect.right - cardWidth - WORD_BOX_MARGIN,
			minY: worldWordBoxRect.top + WORD_BOX_MARGIN,
			maxY: worldWordBoxRect.bottom - cardHeight - WORD_BOX_MARGIN
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

	function getRenderZIndex() {
		if (isInWordBox) {
			return WORD_BOX_LAYER_Z + IN_BOX_Z_OFFSET + zIndex;
		}

		return Math.min(zIndex, WORD_BOX_LAYER_Z - 1);
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

	function onPointerMove(event: PointerEvent) {
		if (!isDragging || activePointerId !== event.pointerId) {
			return;
		}

		cardX = event.clientX - offsetX + panX;
		cardY = event.clientY - offsetY + panY;
	}

	function finishDrag() {
		isDragging = false;
		activePointerId = null;
		const bounds = getPlacementBounds();
		moveInsideWordBoxIfNeeded(bounds);
		const insideWordBox = updateWordBoxState(bounds);

		if (insideWordBox) {
			updatePositionPercent(bounds);
		} else {
			positionPercentInWordBox = null;
		}
	}

	function onPointerUp(event: PointerEvent) {
		if (activePointerId !== event.pointerId) {
			return;
		}

		finishDrag();
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerCancel);
	}

	function onPointerCancel(event: PointerEvent) {
		if (activePointerId !== event.pointerId) {
			return;
		}

		finishDrag();
		window.removeEventListener('pointermove', onPointerMove);
		window.removeEventListener('pointerup', onPointerUp);
		window.removeEventListener('pointercancel', onPointerCancel);
	}

	function onPointerDown(event: PointerEvent) {
		if (event.button !== 0 && event.pointerType === 'mouse') {
			return;
		}

		event.preventDefault();
		isDragging = true;
		activePointerId = event.pointerId;
		zIndex = getNextZIndex();
		rotation = getRandomRotation();
		offsetX = event.clientX - (cardX - panX);
		offsetY = event.clientY - (cardY - panY);
		updateWordBoxState();
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerCancel);
	}

	function onMouseEnter() {
		if (!isInWordBox || isDragging || isPanning) {
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
		if (!hoveredCard || hoveredCard.id === cardId || !isInWordBox || isDragging || isPanning) {
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

	$effect(() => {
		if (!hasInitialized) {
			previousPanX = panX;
			previousPanY = panY;
			return;
		}

		const deltaX = panX - previousPanX;
		const deltaY = panY - previousPanY;

		if (isInWordBox && !isDragging && (deltaX !== 0 || deltaY !== 0)) {
			cardX += deltaX;
			cardY += deltaY;
			updateWordBoxState();
		}

		previousPanX = panX;
		previousPanY = panY;
	});
</script>

<div
	bind:this={cardElement}
	class="word-card"
	class:moving={isDragging}
	onpointerdown={onPointerDown}
	onmouseenter={onMouseEnter}
	onmouseleave={onMouseLeave}
	role="button"
	tabindex="0"
	style={`left: ${cardX - panX}px; top: ${cardY - panY}px; z-index: ${getRenderZIndex()}; --shadow-near: ${shadowOffset}px; translate: ${hoverOffsetX}px ${hoverOffsetY}px; transform: rotate(${rotation}deg) ${isDragging ? 'scale(1.04)' : ''};`}
>
	{text}
</div>

<style>
	@import url('https://fonts.googleapis.com/css2?family=Merriweather:wght@400;700&display=swap');

	.word-card {
		position: absolute;
		user-select: none;
		touch-action: none;
		cursor: grab;
		padding: 0.3rem 0.5rem;
		font-size: large;
		font-family: 'Merriweather', Georgia, 'Times New Roman', Times, serif;
		background-color: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		transition:
			transform 0.2s ease,
			translate 0.35s ease-in-out,
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			color var(--theme-transition-duration) var(--theme-transition-easing),
			border-color var(--theme-transition-duration) var(--theme-transition-easing),
			box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
		box-shadow: var(--surface-shadow) var(--shadow-near) var(--shadow-near) 0px;
	}

	.word-card.moving {
		cursor: grabbing;
		transition: transform 0.2s ease;
	}
</style>
