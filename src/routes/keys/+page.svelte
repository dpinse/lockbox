<script lang="ts">
	import QRCode from 'qrcode';
	import { tick } from 'svelte';
	import { focusOnMount } from '#lib/focus.ts';
	import { downloadText } from '#lib/download.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { encodeKey, generateKeyPair, shareLink } from '#lib/lockbox/keys.ts';

	let pair = $state<{ publicText: string; privateText: string; link: string; qr: string } | null>(null);
	let copied = $state('');
	let moreShare = $state(false);
	let savedPrivate = $state(false);
	let savedBy = $state<'download' | 'copy' | null>(null);
	let confirmingNew = $state(false);
	let publicHeading = $state<HTMLHeadingElement>();
	let downloadButton = $state<HTMLButtonElement>();

	// An unsaved private key exists only on this page; warn before it is lost.
	$effect(() => {
		if (!pair || savedPrivate) return;
		const warn = (e: BeforeUnloadEvent) => e.preventDefault();
		addEventListener('beforeunload', warn);
		return () => removeEventListener('beforeunload', warn);
	});

	async function keepPair() {
		confirmingNew = false;
		await tick();
		downloadButton?.focus(); // the confirm is gone; saving the key is the next thing to do
	}

	function requestNew() {
		if (savedPrivate) generate();
		else confirmingNew = true;
	}

	async function generate() {
		const { publicKey, privateKey } = generateKeyPair();
		const link = shareLink(location.origin, publicKey);
		pair = {
			publicText: encodeKey('public', publicKey),
			privateText: encodeKey('private', privateKey),
			link,
			qr: await QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#15181d', light: '#ffffff' } })
		};
		moreShare = false;
		savedPrivate = false;
		savedBy = null;
		confirmingNew = false;
		await tick();
		publicHeading?.focus(); // the button that was focused is gone or replaced
	}

	async function copy(what: string, text: string) {
		await navigator.clipboard.writeText(text);
		if (what === 'private') ((savedPrivate = true), (savedBy ??= 'copy'));
		copied = what;
		setTimeout(() => (copied = ''), 1600);
	}

	function downloadPrivate() {
		if (!pair) return;
		downloadText('lockbox-private-key.txt', pair.privateText + '\n');
		savedPrivate = true;
		savedBy = 'download';
	}
</script>

<svelte:head><title>Keys · lockbox</title></svelte:head>

<div class="page-head">
	<h1>Your key pair</h1>
	<p>With keys, only the recipient can open a file, and they can tell it came from you. lockbox never stores your keys.</p>
</div>

<section class="card">
	{#if !pair}
		<div class="empty">
			<p>A key pair is two matching keys: a <strong>public key</strong> you share with anyone, and a <strong>private key</strong> only you keep.</p>
			<button class="btn btn-primary" type="button" onclick={generate}><Icon name="key" size={18} />Create a key pair</button>
		</div>
	{:else}
		<div class="half">
			<div class="half-head">
				<h2 bind:this={publicHeading} tabindex="-1">Public key</h2>
				<span class="tag share">Share freely</span>
			</div>
			<p class="hint">People need it to send you files, and to check files you send them.</p>
			<p class="key mono">{pair.publicText}</p>
			<div class="row">
				<button class="btn" type="button" onclick={() => copy('public', pair!.publicText)}><Icon name={copied === 'public' ? 'check' : 'copy'} size={18} />{copied === 'public' ? 'Copied' : 'Copy public key'}</button>
				<button class="btn" type="button" aria-expanded={moreShare} aria-controls="more-share" onclick={() => (moreShare = !moreShare)}><Icon name="qr" size={18} />More ways to share</button>
			</div>
			{#if moreShare}
				<div class="more" id="more-share">
					<figure class="qr">
						<!-- QR SVG is generated locally from our own link text. -->
						{@html pair.qr}
					</figure>
					<div>
						<p class="hint">A link or QR code opens lockbox with your public key already filled in, ready to encrypt a file for you.</p>
						<button class="btn" type="button" onclick={() => copy('link', pair!.link)}><Icon name={copied === 'link' ? 'check' : 'copy'} size={18} />{copied === 'link' ? 'Copied' : 'Copy share link'}</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="half secret">
			<div class="half-head">
				<h2>Private key</h2>
				<span class="tag never">Never share</span>
			</div>
			{#if savedPrivate}
				<p class="notice"><Icon name="check" size={18} /><span>{savedBy === 'copy' ? 'Copied. Paste it somewhere lasting, like a password manager: the clipboard is temporary.' : 'Downloaded. Keep the file somewhere safe: you need it to open files sent to you.'} <a href="/">Now encrypt a file</a></span></p>
			{:else}
				<p class="notice danger"><Icon name="alert" size={18} />Save it now. If you lose it, files sent to you can't be opened, and lockbox can't recover it.</p>
			{/if}
			<p class="key mono">{pair.privateText}</p>
			<div class="row">
				<button class="btn btn-primary" type="button" onclick={downloadPrivate} bind:this={downloadButton}><Icon name={savedPrivate ? 'check' : 'download'} size={18} />{savedPrivate ? 'Downloaded' : 'Download as file'}</button>
				<button class="btn" type="button" onclick={() => copy('private', pair!.privateText)}><Icon name={copied === 'private' ? 'check' : 'copy'} size={18} />{copied === 'private' ? 'Copied' : 'Copy private key'}</button>
			</div>
		</div>

		{#if confirmingNew}
			<div class="notice danger replace" role="alert">
				<Icon name="alert" size={18} />
				<div>
					<p><strong>This private key isn't saved yet.</strong> A new pair replaces it for good.</p>
					<div class="row">
						<button class="btn" type="button" onclick={generate}>Replace it</button>
						<button class="btn btn-primary" type="button" onclick={keepPair} use:focusOnMount>Keep this pair</button>
					</div>
				</div>
			</div>
		{:else}
			<p class="again"><button class="btn-link" type="button" onclick={requestNew}>Create a different key pair</button></p>
		{/if}
	{/if}
</section>

<style>
	.empty {
		display: grid;
		gap: 20px;
		justify-items: center;
		text-align: center;
		padding: 12px 0;
		color: var(--ink-2);
	}
	.empty strong {
		color: var(--ink);
		font-weight: 600;
	}
	.half + .half {
		margin-top: 28px;
		padding-top: 28px;
		border-top: 1px solid var(--line);
	}
	.half-head {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	h2 {
		font-size: 18px;
		font-weight: 600;
	}
	.tag {
		font-size: 13px;
		font-weight: 600;
		padding: 3px 8px;
		border-radius: 999px;
	}
	.share {
		background: var(--blue-soft);
		color: var(--blue-text);
	}
	.never {
		background: var(--red-soft);
		color: var(--red);
	}
	.key {
		margin-top: 14px;
		padding: 12px 14px;
		border-radius: var(--radius-sm);
		background: var(--field);
		border: 1px solid var(--line-strong);
		word-break: break-all;
		user-select: all;
	}
	.notice {
		margin-top: 12px;
	}
	.row {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 12px;
	}
	.more {
		display: flex;
		align-items: flex-start;
		gap: 20px;
		margin-top: 16px;
	}
	.more .hint {
		margin: 0 0 12px;
	}
	.qr {
		margin: 0;
		flex: none;
	}
	.replace {
		margin-top: 24px;
	}
	.replace p {
		margin: 0;
	}
	.replace strong {
		font-weight: 600;
	}
	@media (max-width: 520px) {
		.more {
			flex-direction: column;
		}
	}
	.qr :global(svg) {
		width: 160px;
		height: 160px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--line);
	}
	.again {
		margin-top: 24px;
		text-align: center;
	}
</style>
