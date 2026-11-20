<script lang="ts">
	import { sealPulse } from '#lib/seal.svelte.ts';

	// `pulse` lets a caller drive its own copy; without it the logo follows the site-wide seal pulse.
	let { size = 30, pulse }: { size?: number; pulse?: number } = $props();

	const trigger = $derived(pulse ?? sealPulse.count);
	let playing = $state(false);
	let seen: number | undefined;
	$effect(() => {
		const t = trigger;
		if (seen === undefined || t === seen) return void (seen = t);
		seen = t;
		playing = false;
		requestAnimationFrame(() => (playing = true));
	});
</script>

<svg
	class="chest"
	class:playing
	width={size}
	height={size * (28 / 32)}
	viewBox="0 0 32 28"
	aria-hidden="true"
	onanimationend={() => (playing = false)}
>
	<g class="lid">
		<path d="M3 12.5C3 6.5 8.5 3 16 3s13 3.5 13 9.5z" fill="var(--blue)" />
		<path d="M9.5 4.6v7.9M22.5 4.6v7.9" stroke="var(--on-blue)" stroke-opacity=".55" stroke-width="1.5" />
	</g>
	<rect x="3" y="13.5" width="26" height="12" rx="1.5" fill="var(--blue)" />
	<path d="M9.5 13.5v12M22.5 13.5v12" stroke="var(--on-blue)" stroke-opacity=".55" stroke-width="1.5" />
	<rect x="13.5" y="11.5" width="5" height="7" rx="1" fill="var(--on-blue)" />
	<circle cx="16" cy="14.4" r="1.05" fill="var(--blue)" />
	<path d="M16 15v1.8" stroke="var(--blue)" stroke-width="1.1" stroke-linecap="round" />
</svg>

<style>
	.chest {
		display: block;
		overflow: visible;
	}
	.lid {
		transform-box: fill-box;
		transform-origin: 0% 100%;
	}
	.playing .lid {
		animation: seal 760ms var(--ease-out);
	}
	/* Lid lifts, then drops shut with a small settle. */
	@keyframes seal {
		0% {
			transform: rotate(0);
		}
		30% {
			transform: translateY(-1.5px) rotate(-24deg);
		}
		62% {
			transform: rotate(2deg);
		}
		80% {
			transform: rotate(-1.5deg);
		}
		100% {
			transform: rotate(0);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.playing .lid {
			animation: none;
		}
	}
</style>
