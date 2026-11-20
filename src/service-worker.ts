/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Streams worker output to disk as a normal browser download, so large files never sit in memory.
import type { SinkMessage, SinkRequest } from '#lib/lockbox/protocol.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;
const PREFIX = '/lockbox-download/';
const downloads = new Map<string, { filename: string; port: MessagePort }>();

sw.addEventListener('install', () => sw.skipWaiting());
sw.addEventListener('activate', (e) => e.waitUntil(sw.clients.claim()));

sw.addEventListener('message', (e) => {
	const m = e.data;
	if (m?.type !== 'download' || typeof m.id !== 'string' || !(m.port instanceof MessagePort)) return;
	downloads.set(m.id, { filename: String(m.filename), port: m.port });
	m.port.postMessage('registered');
});

sw.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (url.origin !== sw.location.origin || !url.pathname.startsWith(PREFIX)) return;
	const id = url.pathname.slice(PREFIX.length);
	const download = downloads.get(id);
	if (!download) return;
	downloads.delete(id);
	e.respondWith(
		new Response(stream(download.port), {
			headers: {
				'Content-Type': 'application/octet-stream',
				'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(download.filename)}`,
				'X-Content-Type-Options': 'nosniff',
				'Content-Security-Policy': "default-src 'none'"
			}
		})
	);
});

function stream(port: MessagePort) {
	let onReply: ((m: SinkMessage) => void) | null = null;
	port.onmessage = (e: MessageEvent<SinkMessage>) => onReply?.(e.data);
	const request = (r: SinkRequest) => port.postMessage(r);
	return new ReadableStream<Uint8Array>({
		pull(controller) {
			return new Promise<void>((resolve) => {
				onReply = (m) => {
					onReply = null;
					if (m.type === 'chunk') controller.enqueue(m.data);
					else if (m.type === 'end') (controller.close(), port.close());
					else (controller.error(new Error('lockbox: failed')), port.close());
					resolve();
				};
				request('pull');
			});
		},
		cancel() {
			request('cancel');
		}
	});
}
