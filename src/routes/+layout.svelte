<script lang="ts">
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	type Theme = 'light' | 'dark';

	const THEME_STORAGE_KEY = 'pocket-poetry-theme';
	let theme = $state<Theme>('light');

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

<button
	class="theme-toggle"
	onclick={toggleTheme}
	type="button"
	aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
>
	{theme === 'light' ? 'Dark mode' : 'Light mode'}
</button>

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
		--surface-shadow: #0b0b0c;
	}

	:global(html),
	:global(body) {
		background-color: var(--app-bg);
		color: var(--app-text);
		transition:
			background-color var(--theme-transition-duration) var(--theme-transition-easing),
			color var(--theme-transition-duration) var(--theme-transition-easing);
	}

	.theme-toggle {
		position: fixed;
		top: 1rem;
		right: 1rem;
		z-index: 30;
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

	@media (prefers-reduced-motion: reduce) {
		:global(html) {
			--theme-transition-duration: 0ms;
		}
	}
</style>
