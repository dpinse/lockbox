<script lang="ts" module>
	// One stroke family: 24px grid, 1.75 stroke, round caps.
	const paths = {
		eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
		'eye-off': 'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1 M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
		refresh: 'M20 11a8 8 0 0 0-14.8-3.5L4 9 M4 4v5h5 M4 13a8 8 0 0 0 14.8 3.5L20 15 M20 20v-5h-5',
		copy: 'M9 9h10v12H9z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
		check: 'M5 12.5l4.5 4.5L19 7.5',
		x: 'M6 6l12 12 M18 6L6 18',
		file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5',
		upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
		download: 'M12 4v12 M7 11l5 5 5-5 M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3',
		sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4',
		moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z',
		key: 'M15 3a6 6 0 1 1-5.3 8.8L3 18.5V21h2.5l1-1H8v-1.5h1.5L12.2 15.8A6 6 0 0 1 15 3Z M16.5 7.5h.01',
		alert: 'M12 3l10 18H2z M12 10v4 M12 17.5h.01',
		qr: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h2v2h-2z M18 14h2 M14 18h2 M18 18h2v2'
	} as const;
	export type IconName = keyof typeof paths;
</script>

<script lang="ts">
	let { name, size = 20 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.75"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#each paths[name].split(' M') as d, i (i)}
		<path d={i === 0 ? d : 'M' + d} />
	{/each}
</svg>
