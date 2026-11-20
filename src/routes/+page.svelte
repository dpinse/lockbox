<script lang="ts">
	import { onMount } from 'svelte';
	import KeyField from '#lib/components/KeyField.svelte';
	import JobList, { type JobStatus } from '#lib/components/JobList.svelte';
	import { JobError, runJob } from '#lib/lockbox/client.ts';
	import type { EncryptSecret } from '#lib/lockbox/format.ts';
	import { keyFromFragment } from '#lib/lockbox/keys.ts';
	import { MIN_PASSWORD_LENGTH, estimateStrength, generatePassword, type Strength } from '#lib/password.ts';
	import { errorMessage, today } from '#lib/messages.ts';

	let files = $state<File[]>([]);
	let mode = $state<'password' | 'key'>('password');
	let password = $state('');
	let showPassword = $state(false);
	let strength = $state<Strength | null>(null);
	let senderPrivateText = $state('');
	let senderPrivate = $state<Uint8Array | null>(null);
	let recipientPublicText = $state('');
	let recipientPublic = $state<Uint8Array | null>(null);
	let bundle = $state(false);
	let jobs = $state<JobStatus[]>([]);
	let busy = $state(false);

	onMount(() => {
		const shared = keyFromFragment(location.hash);
		if (shared) {
			mode = 'key';
			recipientPublicText = shared;
		}
	});

	$effect(() => {
		const pw = password;
		if (!pw) return void (strength = null);
		estimateStrength(pw).then((s) => {
			if (pw === password) strength = s;
		});
	});

	const strengthLabel = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
	let passwordOk = $derived(password.length >= MIN_PASSWORD_LENGTH);
	let canEncrypt = $derived(
		files.length > 0 && !busy && (mode === 'password' ? passwordOk : !!senderPrivate && !!recipientPublic)
	);

	function generate() {
		password = generatePassword();
		showPassword = true;
	}

	async function encrypt(e: SubmitEvent) {
		e.preventDefault();
		if (!canEncrypt) return;
		const secret: EncryptSecret =
			mode === 'password'
				? { password }
				: { senderPrivate: senderPrivate!, recipientPublic: recipientPublic! };
		const outputs =
			bundle && files.length > 1
				? [{ files: [...files], name: `lockbox-${today()}.zip.lockbox`, bundle: true }]
				: files.map((f) => ({ files: [f], name: `${f.name}.lockbox`, bundle: false }));

		busy = true;
		jobs = outputs.map((o) => ({ name: o.name, state: 'working', bytes: 0 }));
		for (const [i, o] of outputs.entries()) {
			try {
				await runJob({ op: 'encrypt', files: o.files, bundle: o.bundle, secret }, o.name, (b) => (jobs[i].bytes = b));
				jobs[i].state = 'done';
			} catch (err) {
				jobs[i].state = 'error';
				jobs[i].message = errorMessage[err instanceof JobError ? err.code : 'unknown'];
			}
		}
		busy = false;
	}
</script>

<h1>Encrypt</h1>

<form onsubmit={encrypt}>
	<label>
		Files
		<input type="file" multiple onchange={(e) => (files = [...(e.currentTarget.files ?? [])])} />
	</label>

	{#if files.length > 1}
		<label><input type="checkbox" bind:checked={bundle} /> Bundle into one Lockbox file</label>
	{/if}

	<fieldset>
		<legend>Mode</legend>
		<label><input type="radio" bind:group={mode} value="password" /> Password</label>
		<label><input type="radio" bind:group={mode} value="key" /> Key</label>
	</fieldset>

	{#if mode === 'password'}
		<div>
			<label for="password">Password</label>
			<input
				id="password"
				type={showPassword ? 'text' : 'password'}
				bind:value={password}
				autocomplete="new-password"
				minlength={MIN_PASSWORD_LENGTH}
				aria-describedby="password-help"
			/>
			<button type="button" onclick={() => (showPassword = !showPassword)}>{showPassword ? 'Hide' : 'Show'}</button>
			<button type="button" onclick={generate}>Generate</button>
			<button type="button" onclick={() => navigator.clipboard.writeText(password)} disabled={!password}>Copy</button>
			<p id="password-help">
				{#if password && !passwordOk}
					At least {MIN_PASSWORD_LENGTH} characters ({password.length} so far).
				{:else if strength}
					{strengthLabel[strength.score]}. Would take {strength.crackTime} to crack.
					{strength.warning ?? ''}
				{:else}
					At least {MIN_PASSWORD_LENGTH} characters. Anyone with this password can open the file.
				{/if}
			</p>
		</div>
	{:else}
		<KeyField label="Your private key" kind="private" bind:value={senderPrivateText} bind:key={senderPrivate} />
		<KeyField label="Recipient's public key" kind="public" bind:value={recipientPublicText} bind:key={recipientPublic} />
	{/if}

	<button type="submit" disabled={!canEncrypt}>Encrypt</button>
</form>

<JobList {jobs} />
