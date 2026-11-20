// Page side: hands jobs to the crypto worker and streams its output to a download.
import type { ErrorCode } from './format';
import type { FromWorker, Job, SinkMessage, SinkRequest } from './protocol';

export const DOWNLOAD_PREFIX = '/lockbox-download/';

export class JobError extends Error {
	constructor(public code: ErrorCode | 'unknown') {
		super(code);
	}
}

let worker: Worker | null = null;
let nextId = 1;
const listeners = new Map<number, (m: FromWorker) => void>();

function getWorker() {
	if (!worker) {
		worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
		worker.onmessage = (e: MessageEvent<FromWorker>) => listeners.get(e.data.id)?.(e.data);
	}
	return worker;
}

type Sink = { port: MessagePort; start: () => void; cleanup: () => void };

/** Streams through the service worker when it controls the page; otherwise collects in memory. */
async function openSink(filename: string): Promise<Sink> {
	const sw = navigator.serviceWorker?.controller;
	if (sw) {
		const channel = new MessageChannel();
		const id = crypto.randomUUID();
		const registered = await Promise.race([
			new Promise<boolean>((resolve) => {
				channel.port2.onmessage = (e) => resolve(e.data === 'registered');
				sw.postMessage({ type: 'download', id, filename, port: channel.port1 }, [channel.port1]);
			}),
			new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 2000))
		]);
		channel.port2.onmessage = null;
		if (registered) {
			const iframe = document.createElement('iframe');
			iframe.hidden = true;
			// Browsers may stop an idle service worker mid-download; page messages keep it alive.
			const ping = setInterval(() => sw.postMessage({ type: 'ping' }), 10_000);
			return {
				port: channel.port2,
				start: () => {
					iframe.src = DOWNLOAD_PREFIX + id;
					document.body.append(iframe);
				},
				cleanup: () => {
					clearInterval(ping);
					setTimeout(() => iframe.remove(), 60_000); // removing too early can abort the download
				}
			};
		}
	}
	return memorySink(filename);
}

// shortcut: holds the whole output in memory (≈1 GB limit); only used when no service worker controls the page.
function memorySink(filename: string): Sink {
	const channel = new MessageChannel();
	const parts: Uint8Array[] = [];
	const request = (r: SinkRequest) => channel.port1.postMessage(r);
	channel.port1.onmessage = (e: MessageEvent<SinkMessage>) => {
		const m = e.data;
		if (m.type === 'chunk') {
			parts.push(m.data);
			request('pull');
		} else if (m.type === 'end') {
			const url = URL.createObjectURL(new Blob(parts as BlobPart[]));
			const a = Object.assign(document.createElement('a'), { href: url, download: filename });
			a.click();
			setTimeout(() => URL.revokeObjectURL(url), 60_000);
		} else {
			parts.length = 0; // failed: never save partial output
		}
	};
	return { port: channel.port2, start: () => request('pull'), cleanup: () => channel.port1.close() };
}

type JobInput = Job extends infer J ? (J extends Job ? Omit<J, 'type' | 'id'> : never) : never;

type JobEvents = { onProgress?: (bytes: number) => void; onSeal?: (seal: string) => void };

/** Runs one job, saving the output as `filename`. Rejects with JobError. */
export function runJob(input: JobInput, filename: string, { onProgress, onSeal }: JobEvents = {}): Promise<void> {
	const id = nextId++;
	const w = getWorker();
	let sink: Sink | null = null;
	return new Promise<void>((resolve, reject) => {
		listeners.set(id, async (m) => {
			if (m.type === 'ready') {
				if (m.seal) onSeal?.(m.seal);
				sink = await openSink(filename);
				w.postMessage({ type: 'sink', id, port: sink.port }, [sink.port]);
				sink.start(); // only after the port reaches the worker, so no pull is lost
			} else if (m.type === 'progress') {
				onProgress?.(m.bytes);
			} else {
				listeners.delete(id);
				sink?.cleanup();
				if (m.type === 'done') resolve();
				else reject(new JobError(m.type === 'error' ? m.code : 'unknown'));
			}
		});
		w.postMessage({ type: 'job', id, ...input });
	});
}
