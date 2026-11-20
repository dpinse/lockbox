import { beforeAll, describe, expect, it } from 'vitest';
import { ready } from './format';
import {
	KeyFormatError,
	decodeKey,
	encodeKey,
	generateKeyPair,
	keyFromFragment,
	publicFromPrivate,
	shareLink
} from './keys';

beforeAll(() => ready);

const reason = (fn: () => unknown) => {
	try {
		fn();
	} catch (e) {
		return e instanceof KeyFormatError ? e.reason : 'other';
	}
	return null;
};

describe('key text', () => {
	it('round-trips both kinds with the right prefix and length', () => {
		const { publicKey, privateKey } = generateKeyPair();
		const pub = encodeKey('public', publicKey);
		const priv = encodeKey('private', privateKey);
		expect(pub).toMatch(/^lockbox-pub-[A-Za-z0-9_-]{43}$/);
		expect(priv).toMatch(/^lockbox-priv-[A-Za-z0-9_-]{43}$/);
		expect(decodeKey('public', `  ${pub}\n`)).toEqual(publicKey);
		expect(decodeKey('private', priv)).toEqual(privateKey);
	});

	it('derives the public key from the private key', () => {
		const { publicKey, privateKey } = generateKeyPair();
		expect(publicFromPrivate(privateKey)).toEqual(publicKey);
	});

	it('catches a private key pasted where a public key belongs, and vice versa', () => {
		const { publicKey, privateKey } = generateKeyPair();
		expect(reason(() => decodeKey('public', encodeKey('private', privateKey)))).toBe('wrong-kind');
		expect(reason(() => decodeKey('private', encodeKey('public', publicKey)))).toBe('wrong-kind');
	});

	it('rejects malformed text', () => {
		expect(reason(() => decodeKey('public', 'hello'))).toBe('malformed');
		expect(reason(() => decodeKey('public', 'lockbox-pub-!!!!'))).toBe('malformed');
		expect(reason(() => decodeKey('public', 'lockbox-pub-AAAA'))).toBe('malformed'); // too short
	});
});

describe('share links', () => {
	it('puts the key in the fragment and reads it back', () => {
		const { publicKey } = generateKeyPair();
		const link = shareLink('https://lockbox.example', publicKey);
		const url = new URL(link);
		expect(url.search).toBe('');
		expect(keyFromFragment(url.hash)).toBe(encodeKey('public', publicKey));
	});

	it('ignores fragments without a public key', () => {
		expect(keyFromFragment('')).toBeNull();
		expect(keyFromFragment('#to=lockbox-priv-abc')).toBeNull();
	});
});
