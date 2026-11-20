<script lang="ts" generics="T extends string">
	let {
		options,
		value = $bindable(),
		label
	}: { options: { value: T; label: string }[]; value: T; label: string } = $props();
	const name = $props.id();
</script>

<div class="seg" role="radiogroup" aria-label={label}>
	{#each options as o (o.value)}
		<label class:on={value === o.value}>
			<input class="visually-hidden" type="radio" {name} value={o.value} bind:group={value} />
			{o.label}
		</label>
	{/each}
</div>

<style>
	.seg {
		display: inline-flex;
		padding: 3px;
		border-radius: var(--radius-sm);
		background: var(--quiet);
	}
	label {
		padding: 7px 16px;
		border-radius: 5px;
		font-weight: 500;
		font-size: 15px;
		color: var(--ink-2);
		cursor: pointer;
		transition:
			background 150ms,
			color 150ms;
	}
	label.on {
		background: var(--seg-on);
		color: var(--ink);
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.1);
	}
	label:has(input:focus-visible) {
		box-shadow: var(--focus);
	}
</style>
