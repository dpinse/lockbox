<script lang="ts" module>
	// locked: the first chunk would not open, so a wrong password or key and tampering look the same.
	export type SealState = 'waiting' | 'working' | 'sealed' | 'intact' | 'torn' | 'locked' | 'failed';
	export type SealJob = {
		name: string;
		seal: string;
		state: SealState;
		done: number;
		total: number;
		message?: string;
		/** Set when the output is held in memory and the user must click to save it. */
		saveUrl?: string;
		/** The user has clicked Save at least once. */
		saved?: boolean;
	};

	/** Saves a memory-held result. Must run inside a click handler: browsers drop downloads without one. */
	export function saveJob(job: SealJob) {
		if (!job.saveUrl) return;
		const a = Object.assign(document.createElement('a'), { href: job.saveUrl, download: job.name });
		document.body.append(a);
		a.click();
		a.remove();
		job.saved = true;
	}
</script>

<script lang="ts">
	import Icon from './Icon.svelte';

	let { job, onsave }: { job: SealJob; onsave?: () => void } = $props();

	const message = $derived(job.saveUrl && job.saved ? 'Saved to your downloads' : job.message);
	const pct = $derived(job.total ? Math.min(100, Math.round((job.done / job.total) * 100)) : 0);
	const label = $derived(
		{
			waiting: 'Waiting',
			working: `${pct}%`,
			sealed: 'Sealed',
			intact: 'Seal intact',
			torn: 'Seal broken',
			locked: "Couldn't open",
			failed: 'Not saved'
		}[job.state]
	);
</script>

<li class="row" data-state={job.state}>
	<div class="seal" aria-hidden={!job.seal}>
		<span class="kind">{job.state === 'torn' ? 'BROKEN' : 'SEAL Nº'}</span>
		<span class="mono num">{job.seal || '····-····'}</span>
		{#if job.state === 'torn'}<svg class="tear" viewBox="0 0 14 60" preserveAspectRatio="none" aria-hidden="true"><path d="M4 0 L9 0 L7 6 L11 11 L6 17 L10 23 L5 29 L9 35 L4 41 L8 47 L3 53 L7 60 L2 60 L0 54 L4 48 L0 42 L5 36 L1 30 L6 24 L2 18 L7 12 L3 6 Z" /></svg>{/if}
	</div>
	<div class="info">
		<span class="name">{#each job.name.split(/(?<=[.\-_])/) as part, i (i)}{part}<wbr />{/each}</span>
		{#if message}
			<span class="msg">
				{message}{#if job.saveUrl && job.saved}
					· <a class="again" href={job.saveUrl} download={job.name}>Save again<span class="visually-hidden"> {job.name}</span></a>{/if}
			</span>
		{/if}
		{#if job.seal}<span class="visually-hidden">Seal number {job.seal}.</span>{/if}
	</div>
	<div class="end">
		<span class="status">
			{#if job.state === 'sealed' || job.state === 'intact'}<Icon name="check" size={16} />{/if}
			{#if job.state === 'torn' || job.state === 'locked' || job.state === 'failed'}<Icon name="alert" size={16} />{/if}
			{label}
		</span>
		{#if job.saveUrl && !job.saved}
			<a class="btn btn-primary save" href={job.saveUrl} download={job.name} onclick={onsave}><Icon name="download" size={16} />Save<span class="visually-hidden"> {job.name}</span></a>
		{/if}
	</div>
	{#if job.state === 'working'}<span class="bar" style:width="{pct}%"></span>{/if}
</li>

<style>
	.row {
		position: relative;
		display: grid;
		grid-template-columns: 156px 1fr auto;
		align-items: center;
		min-height: 60px;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--card);
		overflow: hidden;
	}
	.seal {
		position: relative;
		align-self: stretch;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 0 14px;
		background: var(--seal);
		color: var(--on-blue);
		/* Perforated tear edge */
		border-right: 2px dashed rgb(255 255 255 / 0.7);
		animation: lay 520ms var(--ease-out) both;
	}
	.kind {
		font: 600 10px/1.2 var(--font);
		letter-spacing: 0.12em;
		opacity: 0.85;
	}
	.num {
		font-size: 13px;
		font-weight: 600;
		line-height: 1.4;
	}
	/* Working or waiting: the seal is drawn but not yet applied. */
	[data-state='waiting'] .seal,
	[data-state='working'] .seal,
	[data-state='locked'] .seal,
	[data-state='failed'] .seal {
		background: transparent;
		color: var(--blue-text);
		border-right: 2px dashed var(--line-strong);
		box-shadow: inset 0 0 0 1.5px var(--blue-soft);
		animation: none;
	}
	[data-state='failed'] .seal,
	[data-state='locked'] .seal {
		color: var(--ink-3);
	}
	[data-state='torn'] .seal {
		background: var(--red);
		color: var(--card);
		border-right-color: transparent;
		animation: none;
	}
	.tear {
		position: absolute;
		top: 0;
		right: 8px;
		width: 14px;
		height: 100%;
		fill: var(--card);
	}
	.info {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 10px 16px;
	}
	.name {
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.msg {
		font-size: 14px;
		color: var(--ink-2);
	}
	[data-state='torn'] .msg,
	[data-state='locked'] .msg,
	[data-state='failed'] .msg {
		color: var(--red);
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding-right: 16px;
		font-size: 14px;
		font-weight: 600;
		color: var(--ink-2);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
	[data-state='sealed'] .status,
	[data-state='intact'] .status {
		color: var(--blue-text);
	}
	[data-state='torn'] .status,
	[data-state='locked'] .status,
	[data-state='failed'] .status {
		color: var(--red);
	}
	.save {
		height: 36px;
		margin-right: 12px;
		font-size: 14px;
		text-decoration: none;
	}
	.end {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-right: 12px;
	}
	.end .status {
		padding-right: 4px;
	}
	.end .save {
		margin-right: 0;
	}
	.again {
		font-weight: 500;
		color: var(--ink-2);
	}
	.again:hover {
		color: var(--ink);
	}
	.bar {
		position: absolute;
		left: 0;
		bottom: 0;
		height: 3px;
		background: var(--blue);
		transition: width 300ms var(--ease-out);
	}
	/* The seal strip is laid across the row from its left edge. */
	@keyframes lay {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	@media (max-width: 520px) {
		.row {
			grid-template-columns: 1fr;
		}
		.seal {
			flex-direction: row;
			align-items: baseline;
			justify-content: flex-start;
			gap: 10px;
			min-height: 36px;
			padding: 8px 14px;
			border-right: 0;
			border-bottom: 2px dashed rgb(255 255 255 / 0.7);
		}
		[data-state='waiting'] .seal,
		[data-state='working'] .seal,
		[data-state='locked'] .seal,
		[data-state='failed'] .seal {
			border-right: 0;
			border-bottom: 2px dashed var(--line-strong);
		}
		.tear {
			display: none;
		}
		.info {
			padding-bottom: 4px;
		}
		.name {
			white-space: normal;
		}
		.end {
			justify-content: space-between;
			padding: 0 16px 12px;
		}
		.end .status {
			padding: 0;
		}
	}
</style>
