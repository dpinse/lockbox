// Runs encryption off the main thread so Argon2id and large files never freeze the page.
import { makeZip } from 'client-zip';
import { LockboxError, decryptStream, encryptStream, ready, sealNumber } from './format';
import type { FromWorker, Job, SinkMessage, SinkRequest, ToWorker } from './protocol';

const post = (m: FromWorker) => self.postMessage(m);
const sinks = new Map<number, (port: MessagePort) => void>();

function counter(id: number) {
	let bytes = 0;
	let last = 0;
	return new TransformStream<Uint8Array, Uint8Array>({
		transform(chunk, c) {
			bytes += chunk.length;
			if (bytes - last > 1 << 20) {
				last = bytes;
				post({ type: 'progress', id, bytes });
			}
			c.enqueue(chunk);
		}
	});
}

async function run(job: Job) {
	const { id } = job;
	try {
		await ready;
		const source =
			job.op === 'encrypt' && job.bundle
				? makeZip(job.files.map((f) => ({ name: f.name, input: f, lastModified: f.lastModified, size: f.size })))
				: job.files[0].stream();
		const transform = job.op === 'encrypt' ? encryptStream(job.secret) : decryptStream(job.secret);
		const reader = source.pipeThrough(counter(id)).pipeThrough(transform).getReader();

		// Read one chunk before asking for a download, so a wrong password fails here, not as a broken download.
		let pending: ReadableStreamReadResult<Uint8Array> | null = await reader.read();
		// Encrypt's first chunk is the whole Lockbox header; decrypt pages read the seal from the file themselves.
		const seal = job.op === 'encrypt' && pending.value ? sealNumber(pending.value) : '';
		const port = await new Promise<MessagePort>((resolve) => {
			sinks.set(id, resolve);
			post({ type: 'ready', id, seal });
		});
		const send = (m: SinkMessage, transfer: Transferable[] = []) => port.postMessage(m, transfer);

		port.onmessage = async (e: MessageEvent<SinkRequest>) => {
			if (e.data === 'cancel') {
				await reader.cancel();
				port.close();
				post({ type: 'cancelled', id });
				return;
			}
			try {
				const result = pending ?? (await reader.read());
				pending = null;
				if (result.done) {
					send({ type: 'end' });
					port.close();
					post({ type: 'done', id });
				} else {
					send({ type: 'chunk', data: result.value }, [result.value.buffer]);
				}
			} catch (err) {
				if (!(err instanceof LockboxError)) console.error(err);
				send({ type: 'error' });
				port.close();
				post({ type: 'error', id, code: err instanceof LockboxError ? err.code : 'unknown' });
			}
		};
	} catch (err) {
		if (!(err instanceof LockboxError)) console.error(err);
		post({ type: 'error', id, code: err instanceof LockboxError ? err.code : 'unknown' });
	}
}

self.onmessage = (e: MessageEvent<ToWorker>) => {
	const m = e.data;
	if (m.type === 'job') run(m);
	else {
		sinks.get(m.id)?.(m.port);
		sinks.delete(m.id);
	}
};
