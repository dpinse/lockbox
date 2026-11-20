/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Two jobs: stream worker output to disk as a normal download (so large files never sit in memory),
// and keep the whole app cached so lockbox works offline after the first visit.
import { assets, immutable, prerendered } from '$app/manifest';
import { version } from '$app/env';
import type { SinkMessage, SinkRequest } from '#lib/lockbox/protocol.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;
const PREFIX = '/lockbox-download/';
const downloads = new Map<string, { filename: string; port: MessagePort }>();

const CACHE = `lockbox-${version}`;
// Manifest paths are relative to the base path, which is the site root here.
const ASSETS = [...immutable, ...assets, ...prerendered].map(({ path }) => (path.startsWith('/') ? path : `/${path}`));
const CACHED = new Set(ASSETS);

sw.addEventListener('install', (e) => {
	e.waitUntil(
		caches
			.open(CACHE)
			.then((c) => c.addAll(ASSETS))
			// First install takes over at once so downloads can stream on the first visit. Updates wait for
			// every tab to close, so an open page never loses the old chunks it may still lazy-load.
			.then(() => (sw.registration.active ? undefined : sw.skipWaiting()))
	);
});

sw.addEventListener('activate', (e) => {
	e.waitUntil(
		caches
			.keys()
			.then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
			.then(() => sw.clients.claim())
	);
});

sw.addEventListener('message', (e) => {
	const m = e.data;
	if (m?.type !== 'download' || typeof m.id !== 'string' || !(m.port instanceof MessagePort)) return;
	downloads.set(m.id, { filename: String(m.filename), port: m.port });
	m.port.postMessage('registered');
});

sw.addEventListener('fetch', (e) => {
	const url = new URL(e.request.url);
	if (url.origin !== sw.location.origin || e.request.method !== 'GET') return;
	if (!url.pathname.startsWith(PREFIX)) return void serveCached(e, url);
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

function serveCached(e: FetchEvent, url: URL) {
	const isPage = e.request.mode === 'navigate';
	if (!CACHED.has(url.pathname) && !isPage) return;
	e.respondWith(
		(async () => {
			const cache = await caches.open(CACHE);
			const hit = await cache.match(CACHED.has(url.pathname) ? url.pathname : e.request);
			if (hit) return hit;
			try {
				return await fetch(e.request);
			} catch (err) {
				// Offline and not cached: any page falls back to the app's home page.
				const home = isPage ? await cache.match('/') : undefined;
				if (home) return home;
				throw err;
			}
		})()
	);
}

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
