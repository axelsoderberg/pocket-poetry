<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { WordCard } from '$lib';
	import { buildInitialWordPositions, type PositionedWord } from '$lib/words/placement';
	import { toCanvas } from 'html-to-image';
	import { getLargestClumpCrop } from '$lib/utils/share-export';
	import type { PageData } from './$types';

	type HoveredWordCard = {
		id: string;
		centerX: number;
		centerY: number;
	};

	let { data }: { data: PageData } = $props();

	let wordBoxElement: HTMLDivElement | null = $state(null);
	let pageElement: HTMLElement | null = $state(null);
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
	let shuffleToken = $state(0);
	let isSharePreviewOpen = $state(false);
	let shareImageDataUrl = $state('');

	// Configurable "extra" padding (in pixels)
	const THRESHOLD = 50;
	const PAN_HORIZONTAL_RATIO = 0.4;
	const PAN_VERTICAL_RATIO = 0.3;
	const PAN_MAX_X = 320;
	const PAN_MAX_Y = 240;
	const SHARE_EVENT_NAME = 'pocketpoetry:share-request';
	const SHARE_IMAGE_PIXEL_RATIO = 2;
	const POLAROID_FRAME_PADDING = 34;
	const POLAROID_TITLE_HEIGHT = 88;
	const POLAROID_TITLE_BOTTOM_GAP = 18;
	const POLAROID_TITLE_FONT_SIZE = 54;
	const POLAROID_PHOTO_SIZE = 900;
	const SHARE_PREVIEW_ASPECT_RATIO =
		(POLAROID_PHOTO_SIZE + POLAROID_FRAME_PADDING * 2) /
		(POLAROID_PHOTO_SIZE + POLAROID_FRAME_PADDING * 2 + POLAROID_TITLE_HEIGHT);

	const clamp = (value: number, min: number, max: number) => {
		return Math.min(Math.max(value, min), max);
	};

	const canUseNativeShare = () => {
		return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
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

	const handleShuffleWordBox = () => {
		shuffleToken += 1;
	};

	const isCenterInWordBox = (rect: DOMRect, wordBoxRect: DOMRect) => {
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;

		return (
			centerX >= wordBoxRect.left &&
			centerX <= wordBoxRect.right &&
			centerY >= wordBoxRect.top &&
			centerY <= wordBoxRect.bottom
		);
	};

	const getWordCardRects = () => {
		if (!pageElement) {
			return {
				all: [] as DOMRect[],
				outsideWordBox: [] as DOMRect[]
			};
		}

		const all = Array.from(pageElement.querySelectorAll<HTMLElement>('.word-card')).map(
			(element) => {
				return element.getBoundingClientRect();
			}
		);

		if (!wordBoxElement) {
			return {
				all,
				outsideWordBox: all
			};
		}

		const wordBoxRect = wordBoxElement.getBoundingClientRect();
		const outsideWordBox = all.filter((rect) => {
			return !isCenterInWordBox(rect, wordBoxRect);
		});

		return {
			all,
			outsideWordBox
		};
	};

	const getFallbackCrop = (containerRect: DOMRect) => {
		if (wordBoxElement) {
			const boxRect = wordBoxElement.getBoundingClientRect();
			const x = clamp(boxRect.left - containerRect.left, 0, containerRect.width);
			const y = clamp(boxRect.top - containerRect.top, 0, containerRect.height);
			const width = clamp(boxRect.width, 1, containerRect.width - x);
			const height = clamp(boxRect.height, 1, containerRect.height - y);

			return { x, y, width, height };
		}

		return {
			x: 0,
			y: 0,
			width: containerRect.width,
			height: containerRect.height
		};
	};

	const getCroppingRect = (containerRect: DOMRect) => {
		const { outsideWordBox } = getWordCardRects();

		if (outsideWordBox.length === 0) {
			return null;
		}

		const clumpCrop = getLargestClumpCrop(outsideWordBox, containerRect);

		if (clumpCrop) {
			return clumpCrop;
		}

		return getFallbackCrop(containerRect);
	};

	const getSquareCropRect = (
		crop: { x: number; y: number; width: number; height: number },
		containerRect: DOMRect
	) => {
		const side = Math.max(crop.width, crop.height);
		const centerX = crop.x + crop.width / 2;
		const centerY = crop.y + crop.height / 2;
		const maxX = Math.max(0, containerRect.width - side);
		const maxY = Math.max(0, containerRect.height - side);
		const x = clamp(centerX - side / 2, 0, maxX);
		const y = clamp(centerY - side / 2, 0, maxY);

		return {
			x,
			y,
			width: Math.min(side, containerRect.width),
			height: Math.min(side, containerRect.height)
		};
	};

	const getExportThemeColors = () => {
		if (typeof window === 'undefined') {
			return {
				appBackground: '#f7f7f5',
				appText: '#1e1e1e',
				frameBackground: '#ffffff',
				frameBorder: '#1e1e1e'
			};
		}

		const styles = getComputedStyle(document.documentElement);
		const appBackground = styles.getPropertyValue('--app-bg').trim() || '#f7f7f5';
		const appText = styles.getPropertyValue('--app-text').trim() || '#1e1e1e';
		const frameBackground = styles.getPropertyValue('--surface-bg').trim() || '#ffffff';
		const frameBorder = styles.getPropertyValue('--surface-border').trim() || '#1e1e1e';

		return { appBackground, appText, frameBackground, frameBorder };
	};

	const waitForNextFrame = () => {
		return new Promise<void>((resolve) => {
			requestAnimationFrame(() => resolve());
		});
	};

	const markWordsInWordBoxForExportHide = () => {
		if (!pageElement || !wordBoxElement) {
			return () => {};
		}

		const wordBoxRect = wordBoxElement.getBoundingClientRect();
		const hiddenCards: HTMLElement[] = [];

		for (const card of pageElement.querySelectorAll<HTMLElement>('.word-card')) {
			const cardRect = card.getBoundingClientRect();

			if (!isCenterInWordBox(cardRect, wordBoxRect)) {
				continue;
			}

			card.setAttribute('data-share-hidden', 'true');
			hiddenCards.push(card);
		}

		return () => {
			for (const card of hiddenCards) {
				card.removeAttribute('data-share-hidden');
			}
		};
	};

	const buildPolaroidImageDataUrl = async () => {
		if (!pageElement) {
			throw new Error('Unable to locate composition area.');
		}

		const containerRect = pageElement.getBoundingClientRect();
		const crop = getCroppingRect(containerRect);
		const { appBackground, appText, frameBackground, frameBorder } = getExportThemeColors();
		const photoWidth = POLAROID_PHOTO_SIZE;
		const photoHeight = POLAROID_PHOTO_SIZE;
		const framePadding = POLAROID_FRAME_PADDING;
		const titleHeight = POLAROID_TITLE_HEIGHT;
		const titleBottomGap = POLAROID_TITLE_BOTTOM_GAP;
		const contentWidth = photoWidth + framePadding * 2;
		const contentHeight = photoHeight + framePadding * 2 + titleHeight;
		const resultCanvas = document.createElement('canvas');

		resultCanvas.width = contentWidth;
		resultCanvas.height = contentHeight;

		const resultContext = resultCanvas.getContext('2d');

		if (!resultContext) {
			throw new Error('Unable to prepare image for export.');
		}

		resultContext.fillStyle = frameBackground;
		resultContext.fillRect(0, 0, contentWidth, contentHeight);
		resultContext.fillStyle = appBackground;
		resultContext.fillRect(framePadding, framePadding, photoWidth, photoHeight);

		const documentRoot = document.documentElement;
		const clearHiddenCards = markWordsInWordBoxForExportHide();

		documentRoot.classList.add('is-exporting-share');
		await waitForNextFrame();

		try {
			if (crop) {
				const squareCrop = getSquareCropRect(crop, containerRect);
				const pageCanvas = await toCanvas(pageElement, {
					pixelRatio: SHARE_IMAGE_PIXEL_RATIO,
					cacheBust: true,
					backgroundColor: appBackground
				});

				const scaleX = pageCanvas.width / containerRect.width;
				const scaleY = pageCanvas.height / containerRect.height;
				const sourceX = squareCrop.x * scaleX;
				const sourceY = squareCrop.y * scaleY;
				const sourceWidth = squareCrop.width * scaleX;
				const sourceHeight = squareCrop.height * scaleY;

				resultContext.drawImage(
					pageCanvas,
					sourceX,
					sourceY,
					sourceWidth,
					sourceHeight,
					framePadding,
					framePadding,
					photoWidth,
					photoHeight
				);
			}
		} finally {
			documentRoot.classList.remove('is-exporting-share');
			clearHiddenCards();
		}

		resultContext.strokeStyle = frameBorder;
		resultContext.lineWidth = 2;
		resultContext.strokeRect(framePadding, framePadding, photoWidth, photoHeight);
		resultContext.fillStyle = appText;
		resultContext.textAlign = 'center';
		resultContext.textBaseline = 'bottom';
		resultContext.font = `${POLAROID_TITLE_FONT_SIZE}px Merriweather, serif`;
		resultContext.fillText(
			`pocket poetry #${data.dayNumber}`,
			contentWidth / 2,
			contentHeight - titleBottomGap
		);

		return resultCanvas.toDataURL('image/png');
	};

	const openSharePreview = async () => {
		try {
			shareImageDataUrl = await buildPolaroidImageDataUrl();
			isSharePreviewOpen = true;
		} catch (error) {
			console.error(error);
		}
	};

	const closeSharePreview = () => {
		isSharePreviewOpen = false;
	};

	const downloadShareImage = () => {
		if (!shareImageDataUrl) {
			return;
		}

		const link = document.createElement('a');
		link.href = shareImageDataUrl;
		link.download = `pocket-poetry-${data.dayNumber}.png`;
		document.body.append(link);
		link.click();
		link.remove();
	};

	const shareImageWithNativeApi = async () => {
		if (!shareImageDataUrl || !canUseNativeShare()) {
			downloadShareImage();
			return;
		}

		try {
			const response = await fetch(shareImageDataUrl);
			const blob = await response.blob();
			const file = new File([blob], `pocket-poetry-${data.dayNumber}.png`, { type: 'image/png' });

			if (typeof navigator.canShare === 'function' && !navigator.canShare({ files: [file] })) {
				downloadShareImage();
				return;
			}

			await navigator.share({
				title: `pocket poetry #${data.dayNumber}`,
				text: `pocket poetry #${data.dayNumber}`,
				files: [file]
			});
		} catch {
			downloadShareImage();
		}
	};

	const handleShareOverlayClick = (event: MouseEvent) => {
		if (event.currentTarget === event.target) {
			closeSharePreview();
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

	onMount(() => {
		const handleShareRequest = () => {
			void openSharePreview();
		};

		window.addEventListener(SHARE_EVENT_NAME, handleShareRequest);

		return () => {
			window.removeEventListener(SHARE_EVENT_NAME, handleShareRequest);
		};
	});
</script>

<svelte:window
	onmousemove={handleMouseMove}
	onpointermove={handlePointerMove}
	onresize={handleWindowResize}
/>

<main
	class="page"
	class:panning={isPanning}
	onpointerdown={handlePagePointerDown}
	bind:this={pageElement}
>
	<title>pocket poetry #{data.dayNumber}</title>
	<div class="page-content">
		<div class="header">
			<h1 class="page-title">pocket poetry <span class="day-number">#{data.dayNumber}</span></h1>
		</div>
		<div class="word-box-shell">
			<div class="word-box-area">
				<button
					class="word-box-shuffle"
					type="button"
					onclick={(event) => {
						event.stopPropagation();
						handleShuffleWordBox();
					}}
					onpointerdown={(event) => {
						event.stopPropagation();
					}}
				>
					Shuffle
				</button>
				<div class="word-box" class:expanded={isExpanded} bind:this={wordBoxElement}></div>
			</div>
		</div>

		{#each positionedWords as word (word.id)}
			<WordCard
				cardId={word.id}
				text={word.text}
				x={word.x}
				y={word.y}
				{panX}
				{panY}
				{shuffleToken}
				{isPanning}
				wordBox={wordBoxElement}
				hoveredCard={hoveredWordCard}
				onHoverInBox={handleCardHoverInBox}
				onLeaveInBox={handleCardLeaveInBox}
			/>
		{/each}
	</div>
</main>

{#if isSharePreviewOpen}
	<div
		class="share-modal-overlay"
		role="presentation"
		onclick={handleShareOverlayClick}
		transition:fade={{ duration: 100 }}
	>
		<div class="share-modal-layout">
			<div
				class="share-preview-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Share preview"
				transition:scale={{ duration: 100, start: 0.97 }}
			>
				<div
					class="share-preview-stage"
					style={`--share-preview-aspect-ratio: ${SHARE_PREVIEW_ASPECT_RATIO};`}
				>
					<img class="share-preview-image" src={shareImageDataUrl} alt="Share preview" />
				</div>
			</div>

			<div
				class="share-options-modal"
				role="dialog"
				aria-modal="true"
				aria-label="Share options"
				transition:scale={{ duration: 100, start: 0.97 }}
			>
				<div class="share-actions">
					<div class="share-primary-actions">
						<button type="button" onclick={downloadShareImage} disabled={!shareImageDataUrl}
							>Download</button
						>
						<button type="button" onclick={shareImageWithNativeApi} disabled={!shareImageDataUrl}>
							{canUseNativeShare() ? 'Share…' : 'Share'}
						</button>
					</div>
					<button type="button" onclick={closeSharePreview}>Close</button>
				</div>
			</div>
		</div>
	</div>
{/if}

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

	.page-content {
		width: 100%;
		max-width: 980px;
	}

	.page.panning {
		cursor: grabbing;
	}

	.header {
		width: 100%;
		max-width: 980px;
		text-align: center;
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
		pointer-events: none;
	}

	.word-box-area {
		position: relative;
		width: 100%;
		max-width: 980px;
		pointer-events: auto;
	}

	.word-box-shuffle {
		display: none;
		position: absolute;
		right: 0;
		top: -2.25rem;
		z-index: 510;
		padding: 0.35rem 0.6rem;
		font-size: 0.8rem;
		font-family: 'Merriweather', serif;
		background: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		box-shadow: var(--surface-shadow) 2px 2px 0px;
		cursor: pointer;
	}

	.word-box {
		width: 100%;
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

	.share-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgb(0 0 0 / 45%);
	}

	.share-modal-layout {
		width: fit-content;
		max-width: calc(100vw - 2rem);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.share-preview-modal,
	.share-options-modal {
		max-width: 100%;
		padding: 1rem;
		background: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		box-shadow:
			var(--surface-shadow) 3px 3px 0px,
			var(--surface-shadow) 6px 6px 0px;
	}

	.share-preview-stage {
		position: relative;
		width: min(80vw, 520px, calc(64vh * var(--share-preview-aspect-ratio)));
		aspect-ratio: var(--share-preview-aspect-ratio);
		margin-top: 0.25rem;
		border: 1px solid var(--surface-border);
		background: var(--app-bg);
		overflow: hidden;
	}

	.share-preview-image {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.share-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
	}

	.share-primary-actions {
		display: flex;
		gap: 0.5rem;
	}

	.share-actions button {
		padding: 0.35rem 0.6rem;
		font-size: 0.8rem;
		font-family: 'Merriweather', serif;
		background: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		box-shadow: var(--surface-shadow) 2px 2px 0px;
		cursor: pointer;
	}

	.share-actions button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	:global(html.is-exporting-share .header),
	:global(html.is-exporting-share .word-box-shell),
	:global(html.is-exporting-share .word-box-shuffle),
	:global(html.is-exporting-share .controls),
	:global(html.is-exporting-share .word-card[data-share-hidden='true']) {
		display: none !important;
	}

	@media (max-width: 640px) {
		.word-box-shuffle {
			display: inline-block;
		}

		.header {
			display: flex;
			justify-content: space-between;
			align-items: center;
			text-align: left;
			padding: 0 1rem;
			box-sizing: border-box;
		}

		.page-title {
			margin: 1rem 0 0;
		}
	}
</style>
