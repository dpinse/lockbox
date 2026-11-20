<script lang="ts">
	import KeyField from '#lib/components/KeyField.svelte';
	import JobList, { type JobStatus } from '#lib/components/JobList.svelte';
	import { JobError, runJob } from '#lib/lockbox/client.ts';
	import { LockboxError, PREAMBLE_BYTES, readMode, type DecryptSecret, type Mode } from '#lib/lockbox/format.ts';
	import { errorMessage } from '#lib/messages.ts';

	let files = $state<File[]>([]);
	let mode = $state<Mode | null>(null);
	let fileError = $state('');
	let password = $state('');
	let recipientPrivateText = $state('');
	let recipientPrivate = $state<Uint8Array | null>(null);
	let senderPublicText = $state('');
	let senderPublic = $state<Uint8Array | null>(null);
	let jobs = $state<JobStatus[]>([]);
	let busy = $state(false);

	let canDecrypt = $derived(
		files.length > 0 && !!mode && !busy && (mode === 'password' ? !!password : !!recipientPrivate && !!senderPublic)
	);

	async function choose(e: Event) {
		files = [...((e.currentTarget as HTMLInputElement).files ?? [])];
		mode = null;
		fileError = '';
		jobs = [];
		try {
			const modes = await Promise.all(
				files.map(async (f) => readMode(new Uint8Array(await f.slice(0, PREAMBLE_BYTES).arrayBuffer())))
			);
			if (new Set(modes).size > 1) fileError = 'These files use different modes. Decrypt them separately.';
			else mode = modes[0] ?? null;
		} catch (err) {
			fileError = errorMessage[err instanceof LockboxError ? err.code : 'unknown'];
		}
	}

	function outputName(name: string) {
		if (name.endsWith('.lockbox') && name.length > 8) return name.slice(0, -8);
		return prompt(`Name for the decrypted copy of "${name}":`, `${name}.decrypted`);
	}

	async function decrypt(e: SubmitEvent) {
		e.preventDefault();
		if (!canDecrypt) return;
		const secret: DecryptSecret =
			mode === 'password' ? { password } : { recipientPrivate: recipientPrivate!, senderPublic: senderPublic! };
		busy = true;
		jobs = [];
		for (const file of files) {
			const name = outputName(file.name);
			if (!name) continue;
			const i = jobs.push({ name, state: 'working', bytes: 0 }) - 1;
			try {
				await runJob({ op: 'decrypt', files: [file], bundle: false, secret }, name, (b) => (jobs[i].bytes = b));
				jobs[i].state = 'done';
			} catch (err) {
				jobs[i].state = 'error';
				jobs[i].message = errorMessage[err instanceof JobError ? err.code : 'unknown'];
			}
		}
		busy = false;
	}
</script>

<h1>Decrypt</h1>

<form onsubmit={decrypt}>
	<label>
		Lockbox files
		<input type="file" multiple accept=".lockbox" onchange={choose} />
	</label>
	{#if fileError}<p role="alert">{fileError}</p>{/if}

	{#if mode === 'password'}
		<label>Password <input type="password" bind:value={password} autocomplete="current-password" /></label>
	{:else if mode === 'key'}
		<KeyField label="Your private key" kind="private" bind:value={recipientPrivateText} bind:key={recipientPrivate} />
		<KeyField label="Sender's public key" kind="public" bind:value={senderPublicText} bind:key={senderPublic} />
	{/if}

	<button type="submit" disabled={!canDecrypt}>Decrypt</button>
</form>

<JobList {jobs} />
