<script lang="ts">
	import Icon from './Icon.svelte';
	import { MIN_PASSWORD_LENGTH, estimateStrength, generatePassword, type Strength } from '#lib/password.ts';

	let {
		value = $bindable(''),
		mode
	}: { value?: string; mode: 'new' | 'current' } = $props();

	const id = $props.id();
	let visible = $state(false);
	let copied = $state(false);
	let strength = $state<Strength | null>(null);

	$effect(() => {
		const pw = value;
		if (mode !== 'new' || !pw) return void (strength = null);
		estimateStrength(pw).then((s) => {
			if (pw === value) strength = s;
		});
	});

	const tooShort = $derived(mode === 'new' && value.length > 0 && value.length < MIN_PASSWORD_LENGTH);
	const filled = $derived(strength ? Math.max(1, strength.score) : 0);
	const tone = $derived(!strength ? '' : strength.score <= 1 ? 'weak' : strength.score === 2 ? 'fair' : 'strong');
	const words = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

	function generate() {
		value = generatePassword();
		visible = true;
	}
	async function copy() {
		await navigator.clipboard.writeText(value);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}
</script>

<label class="field-label" for={id}>Password</label>
<div class="field" data-invalid={tooShort}>
	<input
		{id}
		class:mono-input={visible && !!value}
		type={visible ? 'text' : 'password'}
		bind:value
		autocomplete={mode === 'new' ? 'new-password' : 'current-password'}
		spellcheck="false"
		aria-describedby="{id}-hint"
	/>
	<div class="field-actions">
		<button type="button" class="icon-btn" onclick={() => (visible = !visible)} aria-label={visible ? 'Hide password' : 'Show password'} title={visible ? 'Hide' : 'Show'}>
			<Icon name={visible ? 'eye-off' : 'eye'} size={18} />
		</button>
		{#if mode === 'new'}
			<button type="button" class="icon-btn" onclick={generate} aria-label="Generate a strong password" title="Generate">
				<Icon name="refresh" size={18} />
			</button>
			<button type="button" class="icon-btn" onclick={copy} disabled={!value} aria-label="Copy password" title={copied ? 'Copied' : 'Copy'}>
				<Icon name={copied ? 'check' : 'copy'} size={18} />
			</button>
		{/if}
	</div>
</div>

{#if mode === 'new'}
	<div class="meter" data-tone={tone} aria-hidden="true">
		{#each [1, 2, 3, 4] as i (i)}<i class:on={i <= filled}></i>{/each}
	</div>
{/if}
<p id="{id}-hint" class={tooShort ? 'error' : 'hint'} aria-live="polite">
	{#if mode === 'current'}
		Enter the password the file was encrypted with.
	{:else if tooShort}
		Use at least {MIN_PASSWORD_LENGTH} characters ({value.length} so far).
	{:else if strength}
		<strong>{words[strength.score]}.</strong> About {strength.crackTime} to crack. {strength.warning ?? ''}
	{:else}
		At least {MIN_PASSWORD_LENGTH} characters, or generate one. You'll need to give it to the recipient separately.
	{/if}
</p>

<style>
	.meter {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 4px;
		margin-top: 10px;
	}
	.meter i {
		height: 4px;
		border-radius: 999px;
		background: var(--quiet);
		transition: background 200ms;
	}
	[data-tone='weak'] i.on {
		background: var(--red);
	}
	[data-tone='fair'] i.on {
		background: var(--ink-2);
	}
	[data-tone='strong'] i.on {
		background: var(--blue);
	}
	strong {
		color: var(--ink);
		font-weight: 600;
	}
	.icon-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
