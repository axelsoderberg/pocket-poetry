<script lang="ts">
	import { WordCard } from '$lib';
	import { buildInitialWordPositions, type PositionedWord } from '$lib/words/placement';
	import type { PageData } from './$types';

	type HoveredWordCard = {
		id: string;
		centerX: number;
		centerY: number;
	};

	let { data }: { data: PageData } = $props();

	let wordBoxElement: HTMLDivElement | null = $state(null);
	let isExpanded = $state(false);
	let positionedWords = $state<PositionedWord[]>([]);
	let hoveredWordCard = $state<HoveredWordCard | null>(null);
	let panX = $state(0);
	let panY = $state(0);
	let isPanning = $state(false);
	let activePanPointerId = $state<number | null>(null);
	let panStartClientX = $state(0);
	let panStartClientY = $state(0);
	let panStartX = $state(0);
	let panStartY = $state(0);

	// Configurable "extra" padding (in pixels)
	const THRESHOLD = 50;
	const PAN_HORIZONTAL_RATIO = 0.4;
	const PAN_VERTICAL_RATIO = 0.3;
	const PAN_MAX_X = 320;
	const PAN_MAX_Y = 240;

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(Math.max(value, min), max);
	};

	const getPanBounds = () => {
		const maxPanX = Math.min(PAN_MAX_X, window.innerWidth * PAN_HORIZONTAL_RATIO);
		const maxPanY = Math.min(PAN_MAX_Y, window.innerHeight * PAN_VERTICAL_RATIO);

		return {
			minX: -maxPanX,
			maxX: maxPanX,
			minY: -maxPanY,
			maxY: maxPanY
		};
	};

	const clampPan = (nextPanX: number, nextPanY: number) => {
		const bounds = getPanBounds();

		return {
			x: clamp(nextPanX, bounds.minX, bounds.maxX),
			y: clamp(nextPanY, bounds.minY, bounds.maxY)
		};
	};

	const enforcePanBounds = () => {
		const clamped = clampPan(panX, panY);
		panX = clamped.x;
		panY = clamped.y;
	};

	const updateExpansionFromPoint = (clientX: number, clientY: number) => {
		if (!wordBoxElement) {
			return;
		}

		const rect = wordBoxElement.getBoundingClientRect();

		isExpanded =
			clientX >= rect.left - THRESHOLD &&
			clientX <= rect.right + THRESHOLD &&
			clientY >= rect.top - THRESHOLD &&
			clientY <= rect.bottom + THRESHOLD;
	};

	const handleMouseMove = (event: MouseEvent) => {
		updateExpansionFromPoint(event.clientX, event.clientY);
	};

	const handlePointerMove = (event: PointerEvent) => {
		updateExpansionFromPoint(event.clientX, event.clientY);
	};

	const isEmptyCanvasTarget = (target: EventTarget | null) => {
		if (!(target instanceof Element)) {
			return true;
		}

		return !target.closest('.word-card');
	};

	const isPointInWordBox = (clientX: number, clientY: number) => {
		if (!wordBoxElement) {
			return false;
		}

		const rect = wordBoxElement.getBoundingClientRect();

		return (
			clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
		);
	};

	const removePanListeners = () => {
		window.removeEventListener('pointermove', handlePanPointerMove);
		window.removeEventListener('pointerup', handlePanPointerUp);
		window.removeEventListener('pointercancel', handlePanPointerCancel);
	};

	const finishPan = () => {
		isPanning = false;
		activePanPointerId = null;
		removePanListeners();
	};

	const handlePanPointerMove = (event: PointerEvent) => {
		if (!isPanning || activePanPointerId !== event.pointerId) {
			return;
		}

		const deltaX = event.clientX - panStartClientX;
		const deltaY = event.clientY - panStartClientY;
		const clampedPan = clampPan(panStartX - deltaX, panStartY - deltaY);

		panX = clampedPan.x;
		panY = clampedPan.y;
		hoveredWordCard = null;
		updateExpansionFromPoint(event.clientX, event.clientY);
	};

	const handleWindowResize = () => {
		enforcePanBounds();
	};

	const handlePanPointerUp = (event: PointerEvent) => {
		if (activePanPointerId !== event.pointerId) {
			return;
		}

		finishPan();
	};

	const handlePanPointerCancel = (event: PointerEvent) => {
		if (activePanPointerId !== event.pointerId) {
			return;
		}

		finishPan();
	};

	const handlePagePointerDown = (event: PointerEvent) => {
		if (event.button !== 0 && event.pointerType === 'mouse') {
			return;
		}

		if (isPointInWordBox(event.clientX, event.clientY)) {
			return;
		}

		if (!isEmptyCanvasTarget(event.target)) {
			return;
		}

		event.preventDefault();
		isPanning = true;
		hoveredWordCard = null;
		activePanPointerId = event.pointerId;
		panStartClientX = event.clientX;
		panStartClientY = event.clientY;
		panStartX = panX;
		panStartY = panY;

		window.addEventListener('pointermove', handlePanPointerMove);
		window.addEventListener('pointerup', handlePanPointerUp);
		window.addEventListener('pointercancel', handlePanPointerCancel);
	};

	const handleCardHoverInBox = (detail: HoveredWordCard) => {
		if (isPanning) {
			return;
		}

		hoveredWordCard = detail;
	};

	const handleCardLeaveInBox = (cardId: string) => {
		if (hoveredWordCard?.id === cardId) {
			hoveredWordCard = null;
		}
	};

	$effect(() => {
		if (!wordBoxElement || positionedWords.length > 0) {
			return;
		}

		positionedWords = buildInitialWordPositions(data.words, wordBoxElement);
	});

	$effect(() => {
		return () => {
			removePanListeners();
		};
	});
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onpointermove={handlePointerMove}
	onresize={handleWindowResize}
/>

<main class="page" class:panning={isPanning} onpointerdown={handlePagePointerDown}>
	<div>
		<div class="header">
			<h1 class="page-title">pocket poetry <span class="day-number">#{data.dayNumber}</span></h1>
		</div>
		<div class="word-box-shell" aria-hidden="true">
			<div class="word-box" class:expanded={isExpanded} bind:this={wordBoxElement}></div>
		</div>

		{#each positionedWords as word (word.id)}
			<WordCard
				cardId={word.id}
				text={word.text}
				x={word.x}
				y={word.y}
				{panX}
				{panY}
				{isPanning}
				wordBox={wordBoxElement}
				hoveredCard={hoveredWordCard}
				onHoverInBox={handleCardHoverInBox}
				onLeaveInBox={handleCardLeaveInBox}
			/>
		{/each}
	</div>
</main>

<style>
	:global(html),
	:global(body) {
		margin: 0;
		height: 100%;
		overflow: hidden;
	}

	.page {
		height: 100vh;
		position: relative;
		overflow: hidden;
		display: flex;
		justify-content: center;
		touch-action: none;
		cursor: grab;
	}

	.page.panning {
		cursor: grabbing;
	}

	.header {
		width: 100%;
		max-width: 980px;
		color: var(--muted-text);
		transition: color var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.page-title {
		font-family: 'Merriweather', serif;
		font-size: 1rem;
		margin: 1rem 1rem 0;
	}

	.day-number {
		color: var(--subtle-text);
		transition: color var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.word-box-shell {
		position: fixed;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		justify-content: center;
		padding: 5rem 1rem 0.75rem;
		z-index: 500;
	}

	.word-box {
		width: 100%;
		max-width: 980px;
		min-width: 100px;
		height: 106px;
		background-color: var(--surface-bg);
		border: 1px solid var(--surface-border);
		box-shadow:
			var(--surface-shadow) 3px 3px 0px,
			var(--surface-shadow) 6px 6px 0px;
		transition:
			height 0.3s ease,
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			border-color var(--theme-transition-duration) var(--theme-transition-easing),
			box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
		transform-origin: bottom center;
	}

	.expanded {
		height: 200px;
	}
</style>
