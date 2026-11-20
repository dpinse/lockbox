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
		children
	}: {
		n: number;
		title: string;
		state: 'todo' | 'current' | 'done';
		summary?: string;
		/** Show the check while the step stays open, e.g. the final step after success. */
		complete?: boolean;
		onedit?: () => void;
		children?: Snippet;
	} = $props();
</script>

<li class="step" data-state={state} aria-current={state === 'current' ? 'step' : undefined}>
	<span class="marker" aria-hidden="true">
		{#if state === 'done' || complete}<Icon name="check" size={16} />{:else}{n}{/if}
	</span>
	<div class="head">
		<h2>{title}</h2>
		{#if state === 'done'}
			{#if summary}<span class="summary">{summary}</span>{/if}
			{#if onedit}<button type="button" class="btn-link" onclick={onedit}>Change<span class="visually-hidden"> {title.toLowerCase()}</span></button>{/if}
		{/if}
	</div>
	{#if state === 'current' && children}
		<div class="body">{@render children()}</div>
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
	h2 {
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
