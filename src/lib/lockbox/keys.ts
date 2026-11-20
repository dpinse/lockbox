// Key text encoding — see "Text encodings" in docs/format.md.
import sodium from 'libsodium-wrappers-sumo';

export const PUBLIC_PREFIX = 'lockbox-pub-';
export const PRIVATE_PREFIX = 'lockbox-priv-';

export type KeyKind = 'public' | 'private';

/** Call after `await ready`. */
export function generateKeyPair() {
	const { publicKey, privateKey } = sodium.crypto_kx_keypair();
	return { publicKey, privateKey };
}

export function publicFromPrivate(privateKey: Uint8Array) {
	return sodium.crypto_scalarmult_base(privateKey);
}

export function encodeKey(kind: KeyKind, key: Uint8Array) {
	const prefix = kind === 'public' ? PUBLIC_PREFIX : PRIVATE_PREFIX;
	return prefix + sodium.to_base64(key, sodium.base64_variants.URLSAFE_NO_PADDING);
}

export class KeyFormatError extends Error {
	constructor(public reason: 'wrong-kind' | 'malformed') {
		super(reason);
		this.name = 'KeyFormatError';
	}
}

/** Parses user-pasted key text. Throws KeyFormatError('wrong-kind') if e.g. a private key is pasted where a public one belongs. */
export function decodeKey(kind: KeyKind, text: string): Uint8Array {
	const trimmed = text.trim();
	const expected = kind === 'public' ? PUBLIC_PREFIX : PRIVATE_PREFIX;
	const other = kind === 'public' ? PRIVATE_PREFIX : PUBLIC_PREFIX;
	if (trimmed.startsWith(other)) throw new KeyFormatError('wrong-kind');
	if (!trimmed.startsWith(expected)) throw new KeyFormatError('malformed');
	let key: Uint8Array;
	try {
		key = sodium.from_base64(trimmed.slice(expected.length), sodium.base64_variants.URLSAFE_NO_PADDING);
	} catch {
		throw new KeyFormatError('malformed');
	}
	if (key.length !== 32) throw new KeyFormatError('malformed');
	return key;
}

/** Share link with the public key in the fragment, which browsers never send to the server. */
export function shareLink(origin: string, publicKey: Uint8Array) {
	return `${origin}/#to=${encodeKey('public', publicKey)}`;
}

/** Returns the public key text from a share-link fragment like `#to=lockbox-pub-…`, or null. */
export function keyFromFragment(hash: string): string | null {
	const value = new URLSearchParams(hash.replace(/^#/, '')).get('to');
	return value?.startsWith(PUBLIC_PREFIX) ? value : null;
}
