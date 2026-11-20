<script lang="ts">
	import QRCode from 'qrcode';
	import { encodeKey, generateKeyPair, shareLink } from '#lib/lockbox/keys.ts';

	let pair = $state<{ publicText: string; privateText: string; link: string; qr: string } | null>(null);

	async function generate() {
		const { publicKey, privateKey } = generateKeyPair();
		const link = shareLink(location.origin, publicKey);
		pair = {
			publicText: encodeKey('public', publicKey),
			privateText: encodeKey('private', privateKey),
			link,
			qr: await QRCode.toDataURL(link, { margin: 1, width: 240 })
		};
	}

	function downloadPrivate() {
		if (!pair) return;
		const url = URL.createObjectURL(new Blob([pair.privateText + '\n'], { type: 'text/plain' }));
		Object.assign(document.createElement('a'), { href: url, download: 'lockbox-private-key.txt' }).click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}

	const copy = (text: string) => navigator.clipboard.writeText(text);
</script>

<h1>Keys</h1>
<p>A key pair lets people encrypt files only you can open, and proves who sent them. lockbox never stores your keys.</p>

<button type="button" onclick={generate}>{pair ? 'Generate a new key pair' : 'Generate a key pair'}</button>

{#if pair}
	<section>
		<h2>Public key</h2>
		<p>Share this with anyone. They need it to send you files, and to check files you send them.</p>
		<code>{pair.publicText}</code>
		<button type="button" onclick={() => copy(pair!.publicText)}>Copy</button>
		<p>Or share this link: <code>{pair.link}</code> <button type="button" onclick={() => copy(pair!.link)}>Copy link</button></p>
		<img src={pair.qr} alt="QR code of your share link" width="240" height="240" />
	</section>

	<section>
		<h2>Private key</h2>
		<p><strong>Save this now and never share it.</strong> If you lose it, files sent to you can't be opened. lockbox can't recover it.</p>
		<code>{pair.privateText}</code>
		<button type="button" onclick={() => copy(pair!.privateText)}>Copy</button>
		<button type="button" onclick={downloadPrivate}>Download as file</button>
	</section>
{/if}
