<script lang="ts">
	import Icon from './Icon.svelte';

	let {
		files = $bindable([]),
		accept,
		label
	}: { files?: File[]; accept?: string; label: string } = $props();

	const id = $props.id();
	let over = $state(false);

	const size = (n: number) =>
		n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(0)} KB` : n < 1073741824 ? `${(n / 1048576).toFixed(1)} MB` : `${(n / 1073741824).toFixed(2)} GB`;

	function add(list: FileList | null | undefined) {
		if (!list?.length) return;
		const known = new Set(files.map((f) => `${f.name}:${f.size}:${f.lastModified}`));
		files = [...files, ...[...list].filter((f) => !known.has(`${f.name}:${f.size}:${f.lastModified}`))];
	}

	function drop(e: DragEvent) {
		e.preventDefault();
		over = false;
		add(e.dataTransfer?.files);
	}
</script>

<div
	class="zone"
	class:over
	class:filled={files.length > 0}
	role="group"
	aria-labelledby="{id}-label"
	ondragover={(e) => {
		e.preventDefault();
		over = true;
	}}
	ondragleave={() => (over = false)}
	ondrop={drop}
>
	{#if files.length}
		<ul class="list">
			{#each files as file, i (file.name + file.size + file.lastModified)}
				<li>
					<Icon name="file" size={18} />
					<span class="name">{file.name}</span>
					<span class="mono size">{size(file.size)}</span>
					<button type="button" class="icon-btn" aria-label="Remove {file.name}" onclick={() => (files = files.filter((_, j) => j !== i))}>
						<Icon name="x" size={16} />
					</button>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="prompt">
		{#if !files.length}<span class="icon"><Icon name="upload" size={22} /></span>{/if}
		<span id="{id}-label">{files.length ? 'Drop more files here or' : label}</span>
		<label class="btn browse" for={id}>Browse files</label>
		<input {id} class="visually-hidden" type="file" multiple {accept} onchange={(e) => {
			add(e.currentTarget.files);
			e.currentTarget.value = '';
		}} />
	</div>
</div>

<style>
	.zone {
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius);
		background: var(--field);
		transition:
			border-color 150ms,
			background 150ms;
	}
	.zone.over {
		border-color: var(--blue);
		background: var(--blue-soft);
	}
	.zone.filled {
		border-style: solid;
		border-width: 1px;
	}
	.prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding: 28px 20px;
		text-align: center;
		color: var(--ink-2);
	}
	.filled .prompt {
		flex-direction: row;
		flex-wrap: wrap;
		justify-content: center;
		padding: 12px 16px;
		font-size: 14px;
		border-top: 1px solid var(--line);
	}
	.icon {
		color: var(--blue-text);
	}
	.prompt :global(.browse) {
		height: 36px;
		font-size: 14px;
	}
	.prompt:has(input:focus-visible) :global(.browse) {
		box-shadow: var(--focus);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 4px 8px 4px 16px;
		max-height: 220px;
		overflow-y: auto;
	}
	.list li {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 0;
		color: var(--ink-2);
	}
	.list li + li {
		border-top: 1px solid var(--line);
	}
	.name {
		flex: 1;
		min-width: 0;
		color: var(--ink);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.size {
		color: var(--ink-2);
	}
</style>
