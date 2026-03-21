<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	type Theme = 'light' | 'dark';

	const THEME_STORAGE_KEY = 'pocket-poetry-theme';
	let theme = $state<Theme>('light');
	let isAboutOpen = $state(false);

	function applyTheme(nextTheme: Theme) {
		theme = nextTheme;

		if (typeof document !== 'undefined') {
			document.documentElement.dataset.theme = nextTheme;
		}

		if (typeof localStorage !== 'undefined') {
			localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
		}
	}

	function toggleTheme() {
		applyTheme(theme === 'light' ? 'dark' : 'light');
	}

	function openAbout() {
		isAboutOpen = true;
	}

	function closeAbout() {
		isAboutOpen = false;
	}

	function handleOverlayClick(event: MouseEvent) {
		if (event.currentTarget === event.target) {
			closeAbout();
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape' && isAboutOpen) {
			closeAbout();
		}
	}

	onMount(() => {
		const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);

		if (storedTheme === 'light' || storedTheme === 'dark') {
			applyTheme(storedTheme);
			return;
		}

		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(prefersDark ? 'dark' : 'light');
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<script>
		(() => {
			let resolvedTheme = 'light';

			try {
				const storageKey = 'pocket-poetry-theme';
				const storedTheme = localStorage.getItem(storageKey);
				const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
				resolvedTheme =
					storedTheme === 'light' || storedTheme === 'dark'
						? storedTheme
						: prefersDark
							? 'dark'
							: 'light';
			} catch {
				resolvedTheme = 'light';
			}

			document.documentElement.dataset.theme = resolvedTheme;
		})();
	</script>
</svelte:head>

<svelte:window onkeydown={handleKeyDown} />

<div class="controls">
	<button
		class="theme-toggle"
		onclick={toggleTheme}
		type="button"
		aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
	>
		{theme === 'light' ? 'Dark mode' : 'Light mode'}
	</button>

	<button
		class="about-toggle"
		onclick={openAbout}
		type="button"
		aria-haspopup="dialog"
		aria-expanded={isAboutOpen}
	>
		About
	</button>
</div>

{#if isAboutOpen}
	<div
		class="about-modal-overlay"
		role="presentation"
		onclick={handleOverlayClick}
		transition:fade={{ duration: 100 }}
	>
		<div
			class="about-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="about-title"
			transition:scale={{ duration: 100, start: 0.97 }}
		>
			<h2 id="about-title">About Pocket Poetry</h2>
			<p>
				Pocket Poetry is a small daily word playground inspired by the classic fridge magnet sets.
				50 random words each day, resets midnight UTC. Enjoy!
			</p>
			<p>Made by Axel Söderberg</p>
			<button class="about-close" type="button" onclick={closeAbout}>Close</button>
		</div>
	</div>
{/if}

{@render children()}

<style>
	:global(html) {
		--theme-transition-duration: 260ms;
		--theme-transition-easing: ease;
		--app-bg: #f7f7f5;
		--app-text: #1e1e1e;
		--muted-text: #555555;
		--subtle-text: #888888;
		--surface-bg: #ffffff;
		--surface-border: #1e1e1e;
		--surface-shadow: #1e1e1e;
	}

	:global(html[data-theme='dark']) {
		--app-bg: #141416;
		--app-text: #f3f3f3;
		--muted-text: #c2c2c2;
		--subtle-text: #9b9b9b;
		--surface-bg: #1d1f23;
		--surface-border: #f3f3f3;
		--surface-shadow: #bbbbbb;
	}

	:global(html),
	:global(body) {
		background-color: var(--app-bg);
		color: var(--app-text);
		transition:
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			color var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.controls {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 30;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.theme-toggle,
	.about-toggle,
	.about-close {
		padding: 0.35rem 0.6rem;
		font-size: 0.8rem;
		font-family: 'Merriweather', serif;
		background: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		box-shadow: var(--surface-shadow) 2px 2px 0px;
		cursor: pointer;
		transition:
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			color var(--theme-transition-duration) var(--theme-transition-easing),
			border-color var(--theme-transition-duration) var(--theme-transition-easing),
			box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.about-modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 10000;
		padding: 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgb(0 0 0 / 45%);
	}

	.about-modal {
		width: min(340px, 100%);
		padding: 1rem;
		background: var(--surface-bg);
		color: var(--app-text);
		border: 1px solid var(--surface-border);
		box-shadow:
			var(--surface-shadow) 3px 3px 0px,
			var(--surface-shadow) 6px 6px 0px;
		transition:
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			color var(--theme-transition-duration) var(--theme-transition-easing),
			border-color var(--theme-transition-duration) var(--theme-transition-easing),
			box-shadow var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.about-modal h2 {
		margin: 0 0 0.5rem;
		font-family: 'Merriweather', serif;
		font-size: 1rem;
	}

	.about-close {
		display: block;
		margin-left: auto;
	}

	/* .about-modal p {
		margin: 0 0 0.75rem;
		line-height: 1.45;
	} */

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			--theme-transition-duration: 0ms;
		}
	}
</style>
