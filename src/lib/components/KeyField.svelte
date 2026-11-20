<script lang="ts">
	import Icon from './Icon.svelte';
	import { KeyFormatError, decodeKey, type KeyKind } from '#lib/lockbox/keys.ts';

	let {
		label,
		kind,
		hint = '',
		value = $bindable(''),
		key = $bindable(null)
	}: { label: string; kind: KeyKind; hint?: string; value?: string; key?: Uint8Array | null } = $props();

	const id = $props.id();

	let error = $derived.by(() => {
		if (!value.trim()) return '';
		try {
			decodeKey(kind, value);
			return '';
		} catch (e) {
			if (e instanceof KeyFormatError && e.reason === 'wrong-kind') {
				return kind === 'public'
					? 'That is a private key. Never share it; paste a public key here.'
					: 'That is a public key. Paste your private key here.';
			}
			return `Not a lockbox ${kind} key. It should start with ${kind === 'public' ? 'lockbox-pub-' : 'lockbox-priv-'}`;
		}
	});

	$effect(() => {
		key = value.trim() && !error ? decodeKey(kind, value) : null;
	});

	async function load(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (file) value = (await file.text()).trim();
		input.value = '';
	}
</script>

<div class="keyfield">
	<label class="field-label" for={id}>{label}</label>
	<div class="field" data-invalid={!!error}>
		<textarea
			{id}
			class="mono-input"
			bind:value
			rows="2"
			spellcheck="false"
			autocomplete="off"
			placeholder={kind === 'public' ? 'lockbox-pub-…' : 'lockbox-priv-…'}
			aria-invalid={!!error}
			aria-describedby="{id}-msg"
		></textarea>
		{#if kind === 'private'}
			<div class="field-actions">
				<label class="icon-btn" title="Load from file">
					<Icon name="upload" size={18} />
					<span class="visually-hidden">Load {label.toLowerCase()} from a file</span>
					<input class="visually-hidden" type="file" accept=".txt,text/plain" onchange={load} />
				</label>
			</div>
		{/if}
	</div>
	<p id="{id}-msg" class={error ? 'error' : 'hint'} role={error ? 'alert' : undefined}>
		{error || hint}
	</p>
</div>

<style>
	.keyfield + :global(.keyfield) {
		margin-top: 18px;
	}
	.field {
		align-items: flex-start;
	}
	.field-actions {
		padding-top: 6px;
	}
	.icon-btn:has(input:focus-visible) {
		box-shadow: var(--focus);
	}
	.hint:empty {
		display: none;
	}
</style>
