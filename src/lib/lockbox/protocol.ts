// Messages between the page, the crypto worker, and the download sink (service worker or in-memory fallback).
import type { DecryptSecret, EncryptSecret, ErrorCode } from './format';

export type Job =
	| { type: 'job'; id: number; op: 'encrypt'; files: File[]; bundle: boolean; secret: EncryptSecret }
	| { type: 'job'; id: number; op: 'decrypt'; files: [File]; bundle: false; secret: DecryptSecret };

export type ToWorker = Job | { type: 'sink'; id: number; port: MessagePort };

export type FromWorker =
	| { type: 'ready'; id: number; seal: string } // first chunk produced: secret is right, safe to start a download
	| { type: 'progress'; id: number; bytes: number }
	| { type: 'done'; id: number }
	| { type: 'cancelled'; id: number }
	| { type: 'error'; id: number; code: ErrorCode | 'unknown' };

/** Sink → worker. */
export type SinkRequest = 'pull' | 'cancel';
/** Worker → sink. */
export type SinkMessage = { type: 'chunk'; data: Uint8Array } | { type: 'end' } | { type: 'error' };
