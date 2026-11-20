<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		n,
		title,
		state,
		summary = '',
		complete = false,
		onedit,
		onsubmit,
		children
	}: {
		n: number;
		title: string;
		state: 'todo' | 'current' | 'done';
		summary?: string;
		/** Show the check while the step stays open, e.g. the final step after success. */
		complete?: boolean;
		onedit?: () => void;
		/** Makes the step body a form, so Enter in a field runs the step's primary action. */
		onsubmit?: () => void;
		children?: Snippet;
	} = $props();

	// Move focus into a step when it opens (not on first page load), so keyboard and screen-reader
	// users continue from where the change happened instead of the top of the page.
	let heading: HTMLHeadingElement;
	let prev: string | undefined;
	$effect(() => {
		if (prev !== undefined && state === 'current' && prev !== 'current') heading.focus();
		prev = state;
	});
</script>

<li class="step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
	<span class="marker" aria-hidden="true">
		{#if state === 'done' || complete}<Icon name="check" size={16} />{:else}{n}{/if}
	</span>
	<div class="head">
		<h2 bind:this={heading} tabindex="-1">{title}</h2>
		{#if state === 'done'}
			{#if summary}<span class="summary">{summary}</span>{/if}
			{#if onedit}<button type="button" class="btn-link" onclick={onedit}>Change<span class="visually-hidden"> {title.toLowerCase()}</span></button>{/if}
		{/if}
	</div>
	{#if state === 'current' && children}
		{#if onsubmit}
			<form
				class="body"
				novalidate
				onsubmit={(e) => {
					e.preventDefault();
					onsubmit();
				}}
			>
				{@render children()}
			</form>
		{:else}
			<div class="body">{@render children()}</div>
		{/if}
	{/if}
</li>

<style>
	.step {
		position: relative;
		display: grid;
		grid-template-columns: 28px minmax(0, 1fr);
		column-gap: 14px;
		padding-bottom: 22px;
	}
	.step:last-child {
		padding-bottom: 0;
	}
	/* Connector between markers */
	.step:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 13.5px;
		top: 32px;
		bottom: 4px;
		width: 1px;
		background: var(--line-strong);
	}
	.marker {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		font: 600 13px/1 var(--font);
		background: var(--quiet);
		color: var(--ink-2);
	}
	.step[data-state='current'] .marker,
	.step[data-state='done'] .marker {
		background: var(--blue);
		color: var(--on-blue);
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 10px;
		min-height: 28px;
		padding-top: 3px;
		flex-wrap: wrap;
	}
	h2:focus:not(:focus-visible) {
		box-shadow: none;
	}
	h2 {
		border-radius: 4px;
		font-size: 16px;
		font-weight: 600;
		line-height: 1.4;
	}
	.step[data-state='todo'] h2 {
		color: var(--ink-3);
		font-weight: 500;
	}
	.summary {
		color: var(--ink-2);
		font-size: 14px;
	}
	.head .btn-link {
		margin-left: auto;
	}
	.body {
		grid-column: 2;
		padding-top: 14px;
	}
</style>
