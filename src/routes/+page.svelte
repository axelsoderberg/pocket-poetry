<script lang="ts">
	import { WordCard } from '$lib';
	import { buildInitialWordPositions, type PositionedWord } from '$lib/words/placement';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let wordBoxElement: HTMLDivElement | null = $state(null);
	let isExpanded = $state(false);
	let positionedWords = $state<PositionedWord[]>([]);

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

	$effect(() => {
		if (!wordBoxElement || positionedWords.length > 0) {
			return;
		}

		positionedWords = buildInitialWordPositions(data.words, wordBoxElement);
	});
</script>

<svelte:window onmousemove={handleMouseMove} />

<main class="page">
	<h1 class="page-title">pocket poetry</h1>
	<div class="word-box-shell" aria-hidden="true">
		<div class="word-box" class:expanded={isExpanded} bind:this={wordBoxElement}></div>
	</div>

	{#each positionedWords as word (word.id)}
		<WordCard text={word.text} x={word.x} y={word.y} wordBox={wordBoxElement} />
	{/each}
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
	}

	.page-title {
		font-family: 'Merriweather', serif;
		font-size: 1rem;
		margin: 1rem 1rem 0;
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
		background-color: #fff;
		border: 1px solid #1e1e1e;
		box-shadow:
			#1e1e1e 3px 3px 0px,
			#1e1e1e 6px 6px 0px;
		transition: height 0.3s ease;
		transform-origin: bottom center;
	}

	.expanded {
		height: 200px;
	}
</style>
