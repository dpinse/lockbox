import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter(),

			// Prerendered pages get this as a <meta> CSP with hashes for SvelteKit's inline scripts.
			// CloudFront adds AWS's managed security headers (X-Frame-Options SAMEORIGIN, HSTS, nosniff); the free
			// flat-rate plan does not allow custom ones, so app.html carries the referrer policy.
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'wasm-unsafe-eval'], // libsodium is WebAssembly
					'style-src': ['self'],
					// Only SvelteKit's screen-reader route announcer, which sets this one inline style attribute.
					'style-src-attr': ['unsafe-hashes', 'sha256-S8qMpvofolR8Mpjy4kQvEm7m1q8clzU4dfDH0AmvZjo='],
					'img-src': ['self', 'data:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'worker-src': ['self'],
					'frame-src': ['self'], // hidden iframe that receives streamed downloads
					'manifest-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['none'],
					'form-action': ['none']
				}
			}
		})
	]
});
