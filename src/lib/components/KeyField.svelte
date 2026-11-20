<script lang="ts">
	import { KeyFormatError, decodeKey, type KeyKind } from '#lib/lockbox/keys.ts';

	let {
		label,
		kind,
		value = $bindable(''),
		key = $bindable(null)
	}: { label: string; kind: KeyKind; value?: string; key?: Uint8Array | null } = $props();

	const id = $props.id();

	let error = $derived.by(() => {
		if (!value.trim()) return '';
		try {
			decodeKey(kind, value);
			return '';
		} catch (e) {
			if (e instanceof KeyFormatError && e.reason === 'wrong-kind') {
				return kind === 'public' ? 'That is a private key. Paste a public key here.' : 'That is a public key. Paste your private key here.';
			}
			return 'Not a valid lockbox key.';
		}
	});

	$effect(() => {
		key = value.trim() && !error ? decodeKey(kind, value) : null;
	});

	async function load(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) value = (await file.text()).trim();
	}
</script>

<div>
	<label for={id}>{label}</label>
	<textarea
		{id}
		bind:value
		rows="2"
		spellcheck="false"
		autocomplete="off"
		placeholder={kind === 'public' ? 'lockbox-pub-…' : 'lockbox-priv-…'}
		aria-invalid={!!error}
		aria-describedby={error ? `${id}-error` : undefined}
	></textarea>
	{#if kind === 'private'}
		<label>Load from file <input type="file" accept=".txt,text/plain" onchange={load} /></label>
	{/if}
	{#if error}<p id="{id}-error" role="alert">{error}</p>{/if}
</div>
