<script lang="ts">
	import QRCode from 'qrcode';
	import Icon from '#lib/components/Icon.svelte';
	import { encodeKey, generateKeyPair, shareLink } from '#lib/lockbox/keys.ts';

	let pair = $state<{ publicText: string; privateText: string; link: string; qr: string } | null>(null);
	let copied = $state('');
	let showQr = $state(false);
	let savedPrivate = $state(false);

	async function generate() {
		const { publicKey, privateKey } = generateKeyPair();
		const link = shareLink(location.origin, publicKey);
		pair = {
			publicText: encodeKey('public', publicKey),
			privateText: encodeKey('private', privateKey),
			link,
			qr: await QRCode.toString(link, { type: 'svg', margin: 1, color: { dark: '#15181d', light: '#ffffff' } })
		};
		showQr = false;
		savedPrivate = false;
	}

	async function copy(what: string, text: string) {
		await navigator.clipboard.writeText(text);
		copied = what;
		setTimeout(() => (copied = ''), 1600);
	}

	function downloadPrivate() {
		if (!pair) return;
		const url = URL.createObjectURL(new Blob([pair.privateText + '\n'], { type: 'text/plain' }));
		Object.assign(document.createElement('a'), { href: url, download: 'lockbox-private-key.txt' }).click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
		savedPrivate = true;
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
				<h2>Public key</h2>
				<span class="tag share">Share freely</span>
			</div>
			<p class="hint">People need it to send you files, and to check files you send them.</p>
			<p class="key mono">{pair.publicText}</p>
			<div class="row">
				<button class="btn" type="button" onclick={() => copy('public', pair!.publicText)}><Icon name={copied === 'public' ? 'check' : 'copy'} size={18} />{copied === 'public' ? 'Copied' : 'Copy key'}</button>
				<button class="btn" type="button" onclick={() => copy('link', pair!.link)}><Icon name={copied === 'link' ? 'check' : 'copy'} size={18} />{copied === 'link' ? 'Copied' : 'Copy share link'}</button>
				<button class="btn" type="button" aria-expanded={showQr} onclick={() => (showQr = !showQr)}><Icon name="qr" size={18} />QR code</button>
			</div>
			{#if showQr}
				<figure class="qr">
					<!-- QR SVG is generated locally from our own link text. -->
					{@html pair.qr}
					<figcaption>Scan to open lockbox with your public key filled in.</figcaption>
				</figure>
			{/if}
		</div>

		<div class="half secret">
			<div class="half-head">
				<h2>Private key</h2>
				<span class="tag never">Never share</span>
			</div>
			<p class="notice danger"><Icon name="alert" size={18} />Save it now. If you lose it, files sent to you can't be opened, and lockbox can't recover it.</p>
			<p class="key mono">{pair.privateText}</p>
			<div class="row">
				<button class="btn btn-primary" type="button" onclick={downloadPrivate}><Icon name={savedPrivate ? 'check' : 'download'} size={18} />{savedPrivate ? 'Downloaded' : 'Download as file'}</button>
				<button class="btn" type="button" onclick={() => copy('private', pair!.privateText)}><Icon name={copied === 'private' ? 'check' : 'copy'} size={18} />{copied === 'private' ? 'Copied' : 'Copy'}</button>
			</div>
		</div>

		<p class="again"><button class="btn-link" type="button" onclick={generate}>Create a different key pair</button></p>
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
	.qr {
		margin: 16px 0 0;
		display: grid;
		justify-items: start;
		gap: 8px;
		font-size: 14px;
		color: var(--ink-2);
	}
	.qr :global(svg) {
		width: 200px;
		height: 200px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--line);
	}
	.again {
		margin-top: 24px;
		text-align: center;
	}
</style>
