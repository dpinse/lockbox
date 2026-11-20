<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';
	import { focusOnMount } from '#lib/focus.ts';
	import { saveJob, type SealJob } from './SealRow.svelte';

	let {
		jobs = $bindable(),
		moreLabel,
		onrestart,
		children
	}: { jobs: SealJob[]; moreLabel: string; onrestart: () => void; children?: Snippet } = $props();

	// Results held in memory (no service worker) exist only in this tab until the user saves them.
	const unsaved = $derived(jobs.filter((j) => j.saveUrl && !j.saved));
	let confirming = $state(false);

	$effect(() => {
		if (!unsaved.length) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		addEventListener('beforeunload', warn);
		return () => removeEventListener('beforeunload', warn);
	});

	$effect(() => {
		if (!unsaved.length) confirming = false;
	});

	function saveAll() {
		for (const job of unsaved) saveJob(job);
	}

	function restart() {
		if (unsaved.length && !confirming) confirming = true;
		else onrestart();
	}

	const count = $derived(unsaved.length === 1 ? '1 file is' : `${unsaved.length} files are`);
</script>

{#if confirming && unsaved.length}
	<div class="notice danger confirm" role="alert">
		<Icon name="alert" size={18} />
		<div>
			<p><strong>{count} not saved yet.</strong> If you start over, {unsaved.length === 1 ? 'it is' : 'they are'} gone: lockbox keeps nothing.</p>
			<div class="confirm-actions">
				<button class="btn btn-primary" type="button" onclick={saveAll} use:focusOnMount>
					<Icon name="download" size={18} />{unsaved.length === 1 ? 'Save it' : 'Save all'}
				</button>
				<button class="btn" type="button" onclick={onrestart}>Discard and start over</button>
			</div>
		</div>
	</div>
{/if}

<div class="actions">
	{@render children?.()}
	{#if unsaved.length > 1 && !confirming}
		<button class="btn btn-primary" type="button" onclick={saveAll}><Icon name="download" size={18} />Save all ({unsaved.length})</button>
	{/if}
	{#if !confirming}
		<button class={unsaved.length ? 'btn' : 'btn btn-primary'} type="button" onclick={restart}>{moreLabel}</button>
	{/if}
</div>

<style>
	.confirm {
		margin-top: 16px;
	}
	.confirm p {
		margin: 0;
	}
	.confirm strong {
		font-weight: 600;
	}
	.confirm-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}
	.actions {
		margin-top: 16px;
	}
	.actions:empty {
		display: none;
	}
</style>
