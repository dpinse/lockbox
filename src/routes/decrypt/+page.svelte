<script lang="ts">
	import PageNav from '#lib/components/PageNav.svelte';
	import Step from '#lib/components/Step.svelte';
	import DropZone from '#lib/components/DropZone.svelte';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import KeyField from '#lib/components/KeyField.svelte';
	import SealRow, { type SealJob } from '#lib/components/SealRow.svelte';
	import ResultActions from '#lib/components/ResultActions.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { JobError, runJob } from '#lib/lockbox/client.ts';
	import { LockboxError, SEAL_BYTES_NEEDED, readMode, sealNumber, type DecryptSecret, type Mode } from '#lib/lockbox/format.ts';
	import { errorMessage, failureMessage, streaming } from '#lib/messages.ts';

	let step = $state<1 | 2 | 3>(1);
	let files = $state<File[]>([]);
	let mode = $state<Mode | null>(null);
	let seals = $state<string[]>([]);
	let fileError = $state('');
	let password = $state('');
	let recipientPrivateText = $state('');
	let recipientPrivate = $state<Uint8Array | null>(null);
	let senderPublicText = $state('');
	let senderPublic = $state<Uint8Array | null>(null);
	let jobs = $state<SealJob[]>([]);
	let running = $state(false);
	let wrongSecret = $state(false);

	// Read each file's header as soon as it is chosen: mode decides step 2, the seal number labels step 3.
	$effect(() => {
		const chosen = files;
		mode = null;
		fileError = '';
		if (!chosen.length) return;
		Promise.all(chosen.map(async (f) => new Uint8Array(await f.slice(0, SEAL_BYTES_NEEDED).arrayBuffer())))
			.then((heads) => {
				if (chosen !== files) return;
				const modes = heads.map(readMode);
				seals = heads.map((h) => {
					try {
						return sealNumber(h);
					} catch {
						return '';
					}
				});
				if (new Set(modes).size > 1) fileError = 'Some of these files use a password and some use keys. Decrypt them separately.';
				else mode = modes[0];
			})
			.catch((err) => {
				if (chosen !== files) return;
				const bad = err instanceof LockboxError ? err.code : 'unknown';
				fileError = chosen.length > 1 ? `One of these files: ${errorMessage[bad].toLowerCase()}` : errorMessage[bad];
			});
	});

	const secretOk = $derived(mode === 'password' ? password.length > 0 : !!recipientPrivate && !!senderPublic);
	const finished = $derived(jobs.length > 0 && !running);
	const unsaved = $derived(jobs.some((j) => j.saveUrl && !j.saved));

	const outputName = (name: string) =>
		name.toLowerCase().endsWith('.lockbox') && name.length > 8 ? name.slice(0, -8) : `${name}.decrypted`;

	async function decrypt() {
		if (!mode || !secretOk || running) return;
		const secret: DecryptSecret =
			mode === 'password' ? { password } : { recipientPrivate: recipientPrivate!, senderPublic: senderPublic! };
		const streamed = streaming();
		running = true;
		wrongSecret = false;
		jobs = files.map((f, i) => ({ name: outputName(f.name), seal: seals[i] ?? '', state: 'waiting', done: 0, total: f.size }));
		for (const [i, file] of files.entries()) {
			jobs[i].state = 'working';
			try {
				const { saveUrl } = await runJob({ op: 'decrypt', files: [file], bundle: false, secret }, jobs[i].name, {
					onProgress: (b) => (jobs[i].done = b)
				});
				jobs[i].state = 'intact';
				jobs[i].saveUrl = saveUrl;
				jobs[i].message = saveUrl ? 'Decrypted, not saved yet' : 'Saved to your downloads';
			} catch (err) {
				const code = err instanceof JobError ? err.code : 'unknown';
				if (code === 'wrong-secret') {
					// Same secret for every file: stop instead of failing each one.
					wrongSecret = true;
					jobs = [];
					break;
				}
				jobs[i].state = code === 'altered' || code === 'incomplete' ? 'torn' : 'failed';
				jobs[i].message = failureMessage(code, streamed);
			}
		}
		running = false;
		if (wrongSecret) step = 2;
	}

	function startOver() {
		for (const j of jobs) if (j.saveUrl) URL.revokeObjectURL(j.saveUrl); // free memory-held output
		files = [];
		password = '';
		jobs = [];
		step = 1;
	}

	const stateOf = (n: number) => (step === n ? 'current' : step > n ? 'done' : 'todo');
	const editable = (n: 1 | 2) => (jobs.length ? undefined : () => (step = n));
	const secretTitle = $derived(mode === 'key' ? 'Enter your keys' : 'Enter the password');
</script>

<svelte:head><title>Decrypt files · lockbox</title></svelte:head>

<div class="page-head">
	<h1>Decrypt files</h1>
	<p>Open lockbox files someone sent you, or ones you saved. Nothing is uploaded.</p>
</div>

<PageNav />

<section class="card after-nav" aria-label="Decrypt files">
	<ol class="steps">
		<Step n={1} title="Choose lockbox files" state={stateOf(1)} summary="{files.length} {files.length === 1 ? 'file' : 'files'}" onedit={editable(1)} onsubmit={() => mode && (step = 2)}>
			<DropZone bind:files accept=".lockbox" label="Drag .lockbox files here, or" />
			{#if fileError}<p class="error" role="alert">{fileError}</p>{/if}
			{#if mode}
				<p class="hint">
					{mode === 'password' ? 'Encrypted with a password.' : 'Encrypted with keys.'}
					{#if seals[0] && files.length === 1}Seal Nº <span class="mono">{seals[0]}</span>.{/if}
				</p>
			{/if}
			<div class="actions">
				<button class="btn btn-primary" type="submit" disabled={!mode}>Next</button>
			</div>
		</Step>

		<Step n={2} title={secretTitle} state={stateOf(2)} summary={mode === 'key' ? 'Keys' : 'Password'} onedit={editable(2)} onsubmit={() => secretOk && ((wrongSecret = false), (step = 3))}>
			{#if wrongSecret}
				<p class="notice danger" role="alert"><Icon name="alert" size={18} />{errorMessage['wrong-secret']} Nothing was saved.</p>
			{/if}
			<div class="secret">
				{#if mode === 'password'}
					<PasswordField bind:value={password} mode="current" />
				{:else}
					<KeyField label="Your private key" kind="private" hint="The private key of the person the file was sent to." bind:value={recipientPrivateText} bind:key={recipientPrivate} />
					<KeyField label="Sender's public key" kind="public" hint="Decryption only works if the file really came from this person." bind:value={senderPublicText} bind:key={senderPublic} />
				{/if}
			</div>
			<div class="actions">
				<button class="btn" type="button" onclick={() => (step = 1)}>Back</button>
				<button class="btn btn-primary" type="submit" disabled={!secretOk}>Next</button>
			</div>
		</Step>

		<Step n={3} title={unsaved ? 'Save your files' : 'Decrypt and save'} state={stateOf(3)} complete={finished && !unsaved && jobs.some((j) => j.state === 'intact')} onsubmit={decrypt}>
			{#if !jobs.length}
				<p class="summary-line">Each file is checked as it is decrypted. If anything was changed, decryption stops.</p>
				<div class="actions">
					<button class="btn" type="button" onclick={() => (step = 2)}>Back</button>
					<button class="btn btn-primary" type="submit" disabled={running}>
						<Icon name="download" size={18} />{running ? 'Checking…' : `Decrypt ${files.length === 1 ? 'file' : `${files.length} files`}`}
					</button>
				</div>
			{:else}
				<ul class="seal-list" aria-live="polite">
					{#each jobs as job (job.name)}<SealRow {job} onsave={() => (job.saved = true)} />{/each}
				</ul>
				{#if finished}
					{#if !unsaved && jobs.every((j) => j.state === 'intact' && j.seal)}
						<p class="notice compare"><Icon name="check" size={18} />Every seal is intact. If the seal numbers match the sender's, you have exactly the files they sent.</p>
					{/if}
					<ResultActions bind:jobs moreLabel="Decrypt more files" onrestart={startOver} />
				{/if}
			{/if}
		</Step>
	</ol>
</section>

<style>
	.secret {
		margin-top: 2px;
	}
	.notice {
		margin-bottom: 16px;
	}
	.notice.compare {
		margin: 16px 0 0;
	}
	.summary-line {
		color: var(--ink-2);
	}
</style>
