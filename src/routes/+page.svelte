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

	// Configurable "extra" padding (in pixels)
	const THRESHOLD = 50;

	const handleMouseMove = (event: MouseEvent) => {
		if (!wordBoxElement) {
			return;
		}

		const rect = wordBoxElement.getBoundingClientRect();

		isExpanded =
			event.clientX >= rect.left - THRESHOLD &&
			event.clientX <= rect.right + THRESHOLD &&
			event.clientY >= rect.top - THRESHOLD &&
			event.clientY <= rect.bottom + THRESHOLD;
	};

	const handleCardHoverInBox = (detail: HoveredWordCard) => {
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
</script>

<svelte:window onmousemove={handleMouseMove} />

<main class="page">
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
		z-index: 0;
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
