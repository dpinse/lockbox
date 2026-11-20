// Lockbox file format v1 — see docs/format.md. Keep this file and the spec in lockstep.
import sodium from 'libsodium-wrappers-sumo';

export const MAGIC = new TextEncoder().encode('LOCKBOX');
export const VERSION = 0x01;
export const MODE_PASSWORD = 0x01;
export const MODE_KEY = 0x02;
export const PREAMBLE_BYTES = 9;
export const PASSWORD_PARAMS_BYTES = 24;
export const STREAM_HEADER_BYTES = 24;
export const CHUNK_BYTES = 64 * 1024;
const ABYTES = 17;
export const ENCRYPTED_CHUNK_BYTES = CHUNK_BYTES + ABYTES;

export const DEFAULT_OPSLIMIT = 3; // libsodium MODERATE
export const DEFAULT_MEMLIMIT = 268435456; // libsodium MODERATE, 256 MiB
const MAX_OPSLIMIT = 16;
const MIN_MEMLIMIT = 8 * 1024 * 1024;
const MAX_MEMLIMIT = 1024 * 1024 * 1024;

export type ErrorCode =
	| 'not-lockbox'
	| 'newer-version'
	| 'invalid'
	| 'wrong-mode'
	| 'wrong-secret'
	| 'altered'
	| 'incomplete';

export class LockboxError extends Error {
	constructor(public code: ErrorCode) {
		super(code);
		this.name = 'LockboxError';
	}
}

export type Mode = 'password' | 'key';

export type EncryptSecret =
	| { password: string; opslimit?: number; memlimit?: number }
	| { senderPrivate: Uint8Array; recipientPublic: Uint8Array };

export type DecryptSecret =
	| { password: string }
	| { recipientPrivate: Uint8Array; senderPublic: Uint8Array };

export const ready = sodium.ready;
type StreamState = ReturnType<typeof sodium.crypto_secretstream_xchacha20poly1305_init_pull>;

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
	if (a.length === 0) return b;
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}

function passwordKey(password: string, salt: Uint8Array, opslimit: number, memlimit: number) {
	const bytes = new TextEncoder().encode(password.normalize('NFC'));
	return sodium.crypto_pwhash(32, bytes, salt, opslimit, memlimit, sodium.crypto_pwhash_ALG_ARGON2ID13);
}

/** Reads the mode from the first 9 bytes, so the app knows whether to ask for a password or keys. */
export function readMode(bytes: Uint8Array): Mode {
	if (bytes.length < PREAMBLE_BYTES || MAGIC.some((b, i) => bytes[i] !== b)) {
		throw new LockboxError('not-lockbox');
	}
	if (bytes[7] !== VERSION) throw new LockboxError('newer-version');
	if (bytes[8] === MODE_PASSWORD) return 'password';
	if (bytes[8] === MODE_KEY) return 'key';
	throw new LockboxError('invalid');
}

function fileHeaderLength(mode: Mode) {
	return PREAMBLE_BYTES + (mode === 'password' ? PASSWORD_PARAMS_BYTES : 0);
}

function encryptKey(secret: EncryptSecret): { fileHeader: Uint8Array; key: Uint8Array } {
	if ('password' in secret) {
		const opslimit = secret.opslimit ?? DEFAULT_OPSLIMIT;
		const memlimit = secret.memlimit ?? DEFAULT_MEMLIMIT;
		const fileHeader = new Uint8Array(PREAMBLE_BYTES + PASSWORD_PARAMS_BYTES);
		const view = new DataView(fileHeader.buffer);
		fileHeader.set(MAGIC);
		fileHeader[7] = VERSION;
		fileHeader[8] = MODE_PASSWORD;
		const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
		fileHeader.set(salt, 9);
		view.setUint32(25, opslimit, true);
		view.setUint32(29, memlimit, true);
		return { fileHeader, key: passwordKey(secret.password, salt, opslimit, memlimit) };
	}
	const fileHeader = new Uint8Array(PREAMBLE_BYTES);
	fileHeader.set(MAGIC);
	fileHeader[7] = VERSION;
	fileHeader[8] = MODE_KEY;
	const senderPublic = sodium.crypto_scalarmult_base(secret.senderPrivate);
	try {
		const { sharedTx } = sodium.crypto_kx_client_session_keys(
			senderPublic,
			secret.senderPrivate,
			secret.recipientPublic
		);
		return { fileHeader, key: sharedTx };
	} catch {
		throw new LockboxError('wrong-secret'); // e.g. an all-zero or low-order public key
	}
}

function decryptKey(fileHeader: Uint8Array, secret: DecryptSecret): Uint8Array {
	const mode = readMode(fileHeader);
	if (mode === 'password') {
		if (!('password' in secret)) throw new LockboxError('wrong-mode');
		const view = new DataView(fileHeader.buffer, fileHeader.byteOffset, fileHeader.byteLength);
		const opslimit = view.getUint32(25, true);
		const memlimit = view.getUint32(29, true);
		// Untrusted file: bound Argon2id cost before running it.
		if (
			opslimit < sodium.crypto_pwhash_OPSLIMIT_MIN ||
			opslimit > MAX_OPSLIMIT ||
			memlimit < MIN_MEMLIMIT ||
			memlimit > MAX_MEMLIMIT
		) {
			throw new LockboxError('invalid');
		}
		return passwordKey(secret.password, fileHeader.subarray(9, 25), opslimit, memlimit);
	}
	if (!('recipientPrivate' in secret)) throw new LockboxError('wrong-mode');
	const recipientPublic = sodium.crypto_scalarmult_base(secret.recipientPrivate);
	try {
		return sodium.crypto_kx_server_session_keys(
			recipientPublic,
			secret.recipientPrivate,
			secret.senderPublic
		).sharedRx;
	} catch {
		throw new LockboxError('wrong-secret'); // e.g. an all-zero or low-order public key
	}
}

/** Original bytes in, Lockbox file bytes out. Runs Argon2id on the first chunk, so it may take a second. */
export function encryptStream(secret: EncryptSecret): TransformStream<Uint8Array, Uint8Array> {
	let state: StreamState;
	let fileHeader: Uint8Array;
	let first = true;
	let buf: Uint8Array = new Uint8Array(0);

	const push = (chunk: Uint8Array, tag: number) => {
		const ad = first ? fileHeader : null;
		first = false;
		return sodium.crypto_secretstream_xchacha20poly1305_push(state, chunk, ad, tag);
	};

	return new TransformStream({
		async start(controller) {
			await sodium.ready;
			const derived = encryptKey(secret);
			fileHeader = derived.fileHeader;
			const init = sodium.crypto_secretstream_xchacha20poly1305_init_push(derived.key);
			state = init.state;
			controller.enqueue(concat(fileHeader, init.header));
		},
		transform(input, controller) {
			buf = concat(buf, input);
			// Strictly greater: always hold back the last chunk so flush can tag it FINAL.
			while (buf.length > CHUNK_BYTES) {
				controller.enqueue(
					push(buf.subarray(0, CHUNK_BYTES), sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE)
				);
				buf = buf.slice(CHUNK_BYTES);
			}
		},
		flush(controller) {
			controller.enqueue(push(buf, sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL));
		}
	});
}

/** Lockbox file bytes in, Original bytes out. Errors with a LockboxError on any failure. */
export function decryptStream(secret: DecryptSecret): TransformStream<Uint8Array, Uint8Array> {
	let state: StreamState | null = null;
	let fileHeader: Uint8Array;
	let first = true;
	let buf: Uint8Array = new Uint8Array(0);

	const pull = (chunk: Uint8Array) => {
		const ad = first ? fileHeader : null;
		const wasFirst = first;
		first = false;
		const result = sodium.crypto_secretstream_xchacha20poly1305_pull(state!, chunk, ad);
		if (!result) throw new LockboxError(wasFirst ? 'wrong-secret' : 'altered');
		return result;
	};

	const readHeader = () => {
		if (state || buf.length < PREAMBLE_BYTES) return;
		const headerLength = fileHeaderLength(readMode(buf));
		if (buf.length < headerLength + STREAM_HEADER_BYTES) return;
		fileHeader = buf.slice(0, headerLength);
		const key = decryptKey(fileHeader, secret);
		state = sodium.crypto_secretstream_xchacha20poly1305_init_pull(
			buf.subarray(headerLength, headerLength + STREAM_HEADER_BYTES),
			key
		);
		buf = buf.slice(headerLength + STREAM_HEADER_BYTES);
	};

	return new TransformStream({
		async start() {
			await sodium.ready;
		},
		transform(input, controller) {
			buf = concat(buf, input);
			readHeader();
			if (!state) return;
			// Strictly greater: the chunk being pulled cannot be the last one in the file.
			while (buf.length > ENCRYPTED_CHUNK_BYTES) {
				const { message, tag } = pull(buf.subarray(0, ENCRYPTED_CHUNK_BYTES));
				if (tag !== sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE) {
					throw new LockboxError('altered'); // FINAL with bytes after it, or an unknown tag
				}
				controller.enqueue(message);
				buf = buf.slice(ENCRYPTED_CHUNK_BYTES);
			}
		},
		flush(controller) {
			if (!state) {
				readMode(buf); // surfaces not-lockbox / newer-version / invalid before "incomplete"
				throw new LockboxError('incomplete');
			}
			if (buf.length < ABYTES) throw new LockboxError('incomplete');
			const { message, tag } = pull(buf);
			if (tag !== sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
				throw new LockboxError('incomplete');
			}
			controller.enqueue(message);
		}
	});
}

/** Bytes from the start of a Lockbox file that are enough for `sealNumber`, whatever the mode. */
export const SEAL_BYTES_NEEDED = PREAMBLE_BYTES + PASSWORD_PARAMS_BYTES + 4;

/** Short public code for one Lockbox file: the first 4 bytes of its random stream header, e.g. "4F2A·91C0". */
export function sealNumber(bytes: Uint8Array): string {
	const start = fileHeaderLength(readMode(bytes));
	const b = bytes.subarray(start, start + 4);
	if (b.length < 4) throw new LockboxError('incomplete');
	const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0').toUpperCase()).join('');
	return `${hex.slice(0, 4)}·${hex.slice(4)}`;
}
