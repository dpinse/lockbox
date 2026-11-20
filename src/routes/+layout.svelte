<script lang="ts">
	import '../app.css';
	import favicon from '#lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import ThemeToggle from '#lib/components/ThemeToggle.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { ready } from '#lib/lockbox/format.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Key parsing and generation need libsodium loaded on the page.
	let loaded = $state(false);
	onMount(() => void ready.then(() => (loaded = true)));
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
</svelte:head>

<a class="skip" href="#main">Skip to content</a>

<header>
	<a class="brand" href="/" aria-label="lockbox home">
		<Logo />
		<span>lockbox</span>
	</a>
	<nav aria-label="Site">
		<a class="link" href="/keys" aria-current={page.url.pathname === '/keys' ? 'page' : undefined}>
			<Icon name="key" size={18} />Keys
		</a>
		<ThemeToggle />
		<a class="icon-btn" href="https://github.com/dpinse/lockbox" aria-label="Source code on GitHub" title="Source on GitHub">
			<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.290 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.570 4.93.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>
		</a>
	</nav>
</header>

<main id="main">
	{#if loaded}
		{@render children()}
	{:else}
		<p class="loading" role="status">Loading…</p>
		<noscript><p class="loading">lockbox runs entirely in your browser and needs JavaScript.</p></noscript>
	{/if}
</main>

<footer>
	<p>Files are encrypted on this device and never uploaded.</p>
	<p>Inspired by <a href="https://github.com/sh-dv/hat.sh">hat.sh</a> · <a href="https://github.com/dpinse/lockbox">Source on GitHub</a></p>
</footer>

<style>
	:global(body) {
		min-height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.skip {
		position: absolute;
		left: 12px;
		top: -48px;
		padding: 8px 12px;
		background: var(--card);
		border-radius: var(--radius-sm);
		z-index: 10;
	}
	.skip:focus {
		top: 12px;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		width: 100%;
		max-width: 1120px;
		margin: 0 auto;
		padding: 18px 24px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--ink);
		text-decoration: none;
		font-weight: 700;
		font-size: 18px;
		letter-spacing: -0.02em;
		border-radius: var(--radius-sm);
	}
	nav {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 12px;
		border-radius: var(--radius-sm);
		color: var(--ink-2);
		font-weight: 500;
		text-decoration: none;
	}
	.link:hover,
	.link[aria-current='page'] {
		color: var(--ink);
		background: var(--quiet);
	}
	main {
		flex: 1;
		width: 100%;
		max-width: 640px;
		margin: 0 auto;
		padding: 24px 20px 56px;
	}
	.loading {
		text-align: center;
		color: var(--ink-2);
		padding: 80px 0;
	}
	footer {
		padding: 24px 20px 32px;
		text-align: center;
		font-size: 14px;
		color: var(--ink-2);
		display: grid;
		gap: 4px;
	}
	footer a {
		color: var(--ink-2);
	}
	footer a:hover {
		color: var(--ink);
	}
	@media (max-width: 520px) {
		header {
			padding: 14px 16px;
		}
		.link {
			padding: 0 8px;
		}
		main {
			padding: 12px 16px 40px;
		}
	}
</style>
