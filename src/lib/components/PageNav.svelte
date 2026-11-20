<script lang="ts">
	import { page } from '$app/state';
	const links = [
		{ href: '/', label: 'Encrypt' },
		{ href: '/decrypt', label: 'Decrypt' }
	];
</script>

<nav aria-label="Encrypt or decrypt">
	{#each links as l (l.href)}
		<a href={l.href} aria-current={page.url.pathname === l.href ? 'page' : undefined}>{l.label}</a>
	{/each}
</nav>

<style>
	nav {
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 4px;
		border-radius: var(--radius);
		background: var(--quiet);
	}
	a {
		padding: 10px;
		border-radius: var(--radius-sm);
		text-align: center;
		font-weight: 500;
		color: var(--ink-2);
		text-decoration: none;
		transition:
			background 150ms,
			color 150ms;
	}
	a:hover {
		color: var(--ink);
	}
	a[aria-current='page'] {
		background: var(--seg-on);
		color: var(--ink);
		font-weight: 600;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
	}
</style>
