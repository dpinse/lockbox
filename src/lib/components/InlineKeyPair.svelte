<script lang="ts">
	import Icon from './Icon.svelte';
	import { focusOnMount } from '#lib/focus.ts';
	import { encodeKey, generateKeyPair } from '#lib/lockbox/keys.ts';

	// Creates a key pair inside the Encrypt flow, so a sender without keys keeps their files and progress.
	let { oncreate }: { oncreate: (privateText: string) => void } = $props();

	let pair = $state<{ publicText: string; privateText: string } | null>(null);
	let saved = $state(false);
	let copied = $state('');

	function create() {
		const { publicKey, privateKey } = generateKeyPair();
		pair = { publicText: encodeKey('public', publicKey), privateText: encodeKey('private', privateKey) };
		oncreate(pair.privateText);
	}

	async function copy(what: 'public' | 'private', text: string) {
		await navigator.clipboard.writeText(text);
		if (what === 'private') saved = true;
		copied = what;
		setTimeout(() => (copied = ''), 1600);
	}

	function download() {
		if (!pair) return;
		const url = URL.createObjectURL(new Blob([pair.privateText + '\n'], { type: 'text/plain' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'lockbox-private-key.txt' });
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
		saved = true;
	}
</script>

{#if !pair}
	<p class="hint">
		Your key pair proves the file came from you. No key pair yet?
		<button class="btn-link" type="button" onclick={create}>Create one here</button>
	</p>
{:else}
	<div class="made" tabindex="-1" use:focusOnMount>
		<p class="title"><Icon name="key" size={18} /><strong>Your new key pair</strong></p>
		<p class="hint">Your private key is filled in above. Save it: you need it to open files people send you, and lockbox can't recover it.</p>
		<div class="row">
			<button class="btn" type="button" onclick={download}><Icon name={saved ? 'check' : 'download'} size={18} />{saved ? 'Saved' : 'Download private key'}</button>
			<button class="btn" type="button" onclick={() => copy('private', pair!.privateText)}><Icon name={copied === 'private' ? 'check' : 'copy'} size={18} />{copied === 'private' ? 'Copied' : 'Copy private key'}</button>
		</div>
		<p class="hint">Send your <strong>public key</strong> to the recipient with the file: they need it to open it.</p>
		<p class="key mono">{pair.publicText}</p>
		<button class="btn" type="button" onclick={() => copy('public', pair!.publicText)}><Icon name={copied === 'public' ? 'check' : 'copy'} size={18} />{copied === 'public' ? 'Copied' : 'Copy public key'}</button>
	</div>
{/if}

<style>
	.made {
		margin-top: 18px;
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius-sm);
		background: var(--field);
	}
	.title {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--blue-text);
	}
	.title strong {
		color: var(--ink);
		font-weight: 600;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}
	.key {
		margin: 8px 0 10px;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		background: var(--card);
		border: 1px solid var(--line-strong);
		word-break: break-all;
		user-select: all;
	}
	strong {
		font-weight: 600;
	}
</style>
