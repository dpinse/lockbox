import { beforeAll, describe, expect, it } from 'vitest';
import {
	CHUNK_BYTES,
	DEFAULT_MEMLIMIT,
	DEFAULT_OPSLIMIT,
	ENCRYPTED_CHUNK_BYTES,
	LockboxError,
	decryptStream,
	encryptStream,
	readMode,
	ready,
	type DecryptSecret,
	type EncryptSecret
} from './format';
import { generateKeyPair } from './keys';

// Cheapest parameters the decoder accepts, so tests stay fast.
const FAST = { opslimit: 1, memlimit: 8 * 1024 * 1024 };
const PASSWORD = 'correct horse battery staple';

beforeAll(() => ready);

function bytes(n: number) {
	const out = new Uint8Array(n);
	for (let i = 0; i < n; i++) out[i] = (i * 31 + 7) & 0xff;
	return out;
}

/** Feeds `input` through `stream` in pieces of `pieceSize`, returning the joined output. */
async function run(stream: TransformStream<Uint8Array, Uint8Array>, input: Uint8Array, pieceSize = 10_000) {
	const source = new ReadableStream<Uint8Array>({
		start(c) {
			for (let i = 0; i < input.length; i += pieceSize) c.enqueue(input.slice(i, i + pieceSize));
			c.close();
		}
	});
	const parts: Uint8Array[] = [];
	await source.pipeThrough(stream).pipeTo(new WritableStream({ write: (p) => void parts.push(p) }));
	const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let at = 0;
	for (const p of parts) (out.set(p, at), (at += p.length));
	return out;
}

const encrypt = (s: EncryptSecret, input: Uint8Array) => run(encryptStream(s), input);
const decrypt = (s: DecryptSecret, input: Uint8Array) => run(decryptStream(s), input);

async function expectCode(promise: Promise<unknown>, code: string) {
	const err = await promise.then(
		() => null,
		(e) => e
	);
	expect(err).toBeInstanceOf(LockboxError);
	expect(err.code).toBe(code);
}

describe('password mode', () => {
	const sizes = [0, 1, CHUNK_BYTES - 1, CHUNK_BYTES, CHUNK_BYTES + 1, 3 * CHUNK_BYTES, 3 * CHUNK_BYTES + 5];
	it.each(sizes)('round-trips %i bytes', async (n) => {
		const original = bytes(n);
		const sealed = await encrypt({ password: PASSWORD, ...FAST }, original);
		expect(readMode(sealed)).toBe('password');
		expect(await decrypt({ password: PASSWORD }, sealed)).toEqual(original);
	});

	it('has the exact size the spec predicts', async () => {
		const sealed = await encrypt({ password: PASSWORD, ...FAST }, bytes(2 * CHUNK_BYTES));
		// header 33 + stream header 24 + two full chunks, the second tagged FINAL
		expect(sealed.length).toBe(33 + 24 + 2 * ENCRYPTED_CHUNK_BYTES);
	});

	it('round-trips when fed one byte at a time', async () => {
		const original = bytes(300);
		const sealed = await run(encryptStream({ password: PASSWORD, ...FAST }), original, 1);
		expect(await run(decryptStream({ password: PASSWORD }), sealed, 1)).toEqual(original);
	});

	it('treats NFC and NFD forms of a password as the same', async () => {
		const sealed = await encrypt({ password: 'café-password-123', ...FAST }, bytes(10));
		expect(await decrypt({ password: 'café-password-123' }, sealed)).toEqual(bytes(10));
	});

	it('writes the default Argon2id parameters and they decrypt', async () => {
		const sealed = await encrypt({ password: PASSWORD }, bytes(10));
		const view = new DataView(sealed.buffer);
		expect(view.getUint32(25, true)).toBe(DEFAULT_OPSLIMIT);
		expect(view.getUint32(29, true)).toBe(DEFAULT_MEMLIMIT);
		expect(await decrypt({ password: PASSWORD }, sealed)).toEqual(bytes(10));
	}, 30_000);

	it('rejects the wrong password', async () => {
		const sealed = await encrypt({ password: PASSWORD, ...FAST }, bytes(10));
		await expectCode(decrypt({ password: 'wrong password!!' }, sealed), 'wrong-secret');
	});

	it('rejects keys for a password file', async () => {
		const sealed = await encrypt({ password: PASSWORD, ...FAST }, bytes(10));
		const k = generateKeyPair();
		await expectCode(decrypt({ recipientPrivate: k.privateKey, senderPublic: k.publicKey }, sealed), 'wrong-mode');
	});
});

describe('tampering and damage', () => {
	let sealed: Uint8Array;
	beforeAll(async () => {
		sealed = await encrypt({ password: PASSWORD, ...FAST }, bytes(3 * CHUNK_BYTES + 5));
	});
	const flip = (at: number) => {
		const copy = sealed.slice();
		copy[at] ^= 1;
		return copy;
	};
	const secret = { password: PASSWORD };

	it('detects a changed salt via header binding', () => expectCode(decrypt(secret, flip(9)), 'wrong-secret'));
	it('detects a changed stream header', () => expectCode(decrypt(secret, flip(40)), 'wrong-secret'));
	it('detects a flipped byte in the first chunk', () => expectCode(decrypt(secret, flip(100)), 'wrong-secret'));
	it('detects a flipped byte in a later chunk', () =>
		expectCode(decrypt(secret, flip(57 + ENCRYPTED_CHUNK_BYTES + 100)), 'altered'));
	it('detects a flipped byte in the last chunk', () => expectCode(decrypt(secret, flip(sealed.length - 1)), 'altered'));

	it('detects a file cut at a chunk boundary', () =>
		expectCode(decrypt(secret, sealed.slice(0, 57 + 2 * ENCRYPTED_CHUNK_BYTES)), 'incomplete'));
	it('detects a file cut mid-chunk', () => expectCode(decrypt(secret, sealed.slice(0, sealed.length - 3)), 'altered'));
	it('detects a file cut inside the header', () => expectCode(decrypt(secret, sealed.slice(0, 20)), 'incomplete'));
	it('detects bytes appended after the end', () =>
		expectCode(decrypt(secret, new Uint8Array([...sealed, 1, 2, 3])), 'altered'));

	it('detects a swapped pair of chunks', () => {
		const a = 57 + ENCRYPTED_CHUNK_BYTES;
		const b = a + ENCRYPTED_CHUNK_BYTES;
		const copy = sealed.slice();
		copy.set(sealed.subarray(b, b + ENCRYPTED_CHUNK_BYTES), a);
		copy.set(sealed.subarray(a, b), b);
		return expectCode(decrypt(secret, copy), 'altered');
	});

	it('detects a full-size FINAL chunk followed by more data', async () => {
		const two = await encrypt({ password: PASSWORD, ...FAST }, bytes(CHUNK_BYTES));
		await expectCode(decrypt(secret, new Uint8Array([...two, ...new Uint8Array(ENCRYPTED_CHUNK_BYTES)])), 'altered');
	});
});

describe('untrusted headers', () => {
	const secret = { password: PASSWORD };
	const header = (edit: (h: Uint8Array, v: DataView) => void) => async () => {
		const sealed = await encrypt({ password: PASSWORD, ...FAST }, bytes(10));
		edit(sealed, new DataView(sealed.buffer));
		return sealed;
	};

	it('rejects a non-Lockbox file', () => expectCode(decrypt(secret, bytes(500)), 'not-lockbox'));
	it('rejects an empty file', () => expectCode(decrypt(secret, new Uint8Array(0)), 'not-lockbox'));
	it('rejects a newer version', async () =>
		expectCode(decrypt(secret, await header((h) => (h[7] = 2))()), 'newer-version'));
	it('rejects an unknown mode', async () => expectCode(decrypt(secret, await header((h) => (h[8] = 9))()), 'invalid'));
	it('rejects memlimit above 1 GiB without running Argon2id', async () =>
		expectCode(decrypt(secret, await header((_, v) => v.setUint32(29, 2 ** 31, true))()), 'invalid'));
	it('rejects memlimit below 8 MiB', async () =>
		expectCode(decrypt(secret, await header((_, v) => v.setUint32(29, 1024, true))()), 'invalid'));
	it('rejects opslimit above 16', async () =>
		expectCode(decrypt(secret, await header((_, v) => v.setUint32(25, 17, true))()), 'invalid'));
	it('rejects opslimit of 0', async () =>
		expectCode(decrypt(secret, await header((_, v) => v.setUint32(25, 0, true))()), 'invalid'));
});

describe('key mode', () => {
	it('round-trips from sender to recipient', async () => {
		const sender = generateKeyPair();
		const recipient = generateKeyPair();
		const original = bytes(CHUNK_BYTES + 123);
		const sealed = await encrypt({ senderPrivate: sender.privateKey, recipientPublic: recipient.publicKey }, original);
		expect(readMode(sealed)).toBe('key');
		expect(sealed.length).toBe(9 + 24 + ENCRYPTED_CHUNK_BYTES + 123 + 17);
		expect(
			await decrypt({ recipientPrivate: recipient.privateKey, senderPublic: sender.publicKey }, sealed)
		).toEqual(original);
	});

	it('fails when the claimed sender is not the real sender', async () => {
		const [sender, impostor, recipient] = [generateKeyPair(), generateKeyPair(), generateKeyPair()];
		const sealed = await encrypt({ senderPrivate: sender.privateKey, recipientPublic: recipient.publicKey }, bytes(10));
		await expectCode(
			decrypt({ recipientPrivate: recipient.privateKey, senderPublic: impostor.publicKey }, sealed),
			'wrong-secret'
		);
	});

	it('fails for someone who is not the recipient', async () => {
		const [sender, recipient, other] = [generateKeyPair(), generateKeyPair(), generateKeyPair()];
		const sealed = await encrypt({ senderPrivate: sender.privateKey, recipientPublic: recipient.publicKey }, bytes(10));
		await expectCode(decrypt({ recipientPrivate: other.privateKey, senderPublic: sender.publicKey }, sealed), 'wrong-secret');
	});

	it('rejects an all-zero sender public key', async () => {
		const [sender, recipient] = [generateKeyPair(), generateKeyPair()];
		const sealed = await encrypt({ senderPrivate: sender.privateKey, recipientPublic: recipient.publicKey }, bytes(10));
		await expectCode(
			decrypt({ recipientPrivate: recipient.privateKey, senderPublic: new Uint8Array(32) }, sealed),
			'wrong-secret'
		);
	});

	it('rejects a password for a key file', async () => {
		const [sender, recipient] = [generateKeyPair(), generateKeyPair()];
		const sealed = await encrypt({ senderPrivate: sender.privateKey, recipientPublic: recipient.publicKey }, bytes(10));
		await expectCode(decrypt({ password: PASSWORD }, sealed), 'wrong-mode');
	});
});
