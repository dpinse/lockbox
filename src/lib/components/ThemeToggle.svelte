<script lang="ts">
	import { onMount } from 'svelte';
	import Icon from './Icon.svelte';

	let dark = $state(false);

	onMount(() => {
		const explicit = document.documentElement.dataset.theme;
		dark = explicit ? explicit === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
	});

	function toggle() {
		dark = !dark;
		const theme = dark ? 'dark' : 'light';
		document.documentElement.dataset.theme = theme;
		try {
			localStorage.setItem('theme', theme);
		} catch {
			// Private mode or blocked storage: the choice just won't persist.
		}
	}
</script>

<button class="icon-btn" type="button" onclick={toggle} aria-label={dark ? 'Use light theme' : 'Use dark theme'} title={dark ? 'Light theme' : 'Dark theme'}>
	<Icon name={dark ? 'sun' : 'moon'} />
</button>
