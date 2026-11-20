<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { ready } from '#lib/lockbox/format.ts';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	// Key parsing and generation need libsodium loaded on the page.
	let loaded = $state(false);
	onMount(() => void ready.then(() => (loaded = true)));

	const links = [
		{ href: '/', label: 'Encrypt' },
		{ href: '/decrypt', label: 'Decrypt' },
		{ href: '/keys', label: 'Keys' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>lockbox</title>
</svelte:head>

<header>
	<strong>lockbox</strong>
	<nav>
		{#each links as link (link.href)}
			<a href={link.href} aria-current={page.url.pathname === link.href ? 'page' : undefined}>{link.label}</a>
		{/each}
	</nav>
</header>

<main>
	{#if loaded}
		{@render children()}
	{:else}
		<p>Loading…</p>
		<noscript>lockbox runs entirely in your browser and needs JavaScript.</noscript>
	{/if}
</main>

<footer>
	<p>Files are encrypted on your device. Nothing is uploaded.</p>
</footer>
