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
	import { errorMessage, streaming } from '#lib/messages.ts';
	import { focusOnMount } from '#lib/focus.ts';

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
	let retried = $state(false); // the last secret failed to open at least one file

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
	const unsavedCount = $derived(jobs.filter((j) => j.saveUrl && !j.saved).length);
	const unsaved = $derived(unsavedCount > 0);
	const openedCount = $derived(jobs.filter((j) => j.state === 'intact').length);
	const hasLocked = $derived(jobs.some((j) => j.state === 'locked'));
	const tornCount = $derived(jobs.filter((j) => j.state === 'torn').length);
	const hasTorn = $derived(tornCount > 0);
	let tornStreamed = $state(false);

	const outputName = (name: string) =>
		name.toLowerCase().endsWith('.lockbox') && name.length > 8 ? name.slice(0, -8) : `${name}.decrypted`;

	async function decrypt() {
		if (!mode || !secretOk || running) return;
		const secret: DecryptSecret =
			mode === 'password' ? { password } : { recipientPrivate: recipientPrivate!, senderPublic: senderPublic! };
		const streamed = streaming();
		retried = false;
		running = true;
		jobs = files.map((f, i) => ({ name: outputName(f.name), seal: seals[i] ?? '', state: 'waiting', done: 0, total: f.size }));
		for (const [i, file] of files.entries()) {
			jobs[i].state = 'working';
			try {
				const { saveUrl } = await runJob({ op: 'decrypt', files: [file], bundle: false, secret }, jobs[i].name, {
					onProgress: (b) => (jobs[i].done = b)
				});
				jobs[i].state = 'intact';
				jobs[i].saveUrl = saveUrl;
				jobs[i].message = saveUrl ? 'Seal intact, not saved yet' : 'Saved to your downloads';
			} catch (err) {
				const code = err instanceof JobError ? err.code : 'unknown';
				// A first chunk that won't open can't tell a wrong secret from tampering, so say both.
				jobs[i].state = code === 'wrong-secret' ? 'locked' : code === 'altered' || code === 'incomplete' ? 'torn' : 'failed';
				jobs[i].message = errorMessage[code]; // what to do next is in the note under the list
				if (code === 'altered' || code === 'incomplete') tornStreamed = streamed;
			}
		}
		running = false;
	}

	function retry() {
		for (const j of jobs) if (j.saveUrl) URL.revokeObjectURL(j.saveUrl);
		jobs = [];
		password = '';
		retried = true;
		step = 2;
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

		<Step n={2} title={secretTitle} state={stateOf(2)} summary={mode === 'key' ? 'Keys' : 'Password'} onedit={editable(2)} onsubmit={() => secretOk && (step = 3)}>
			{#if retried}
				<p class="notice danger" role="alert"><Icon name="alert" size={18} />{mode === 'key' ? "Those keys didn't open it." : "That password didn't open it."} Check it, or ask the sender which one they used.</p>
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

		<Step n={3} title={unsaved ? 'Save your files' : 'Decrypt and save'} state={stateOf(3)} complete={finished && !unsaved && jobs.every((j) => j.state === 'intact')} onsubmit={decrypt}>
			{#if !jobs.length}
				<p class="summary-line">Each file is checked as it is decrypted. If anything was changed, decryption stops.</p>
				<div class="actions">
					<button class="btn" type="button" onclick={() => (step = 2)}>Back</button>
					<button class="btn btn-primary" type="submit" disabled={running}>
						<Icon name="download" size={18} />Decrypt {files.length === 1 ? 'file' : `${files.length} files`}
					</button>
				</div>
			{:else}
				<p class="checked" tabindex="-1" use:focusOnMount>
					{#if running}
						<strong>Checking each file…</strong>
					{:else if openedCount === jobs.length}
						<strong>{jobs.length === 1 ? 'Seal intact' : 'All seals intact'}</strong>
					{:else}
						<strong>{openedCount} of {jobs.length} {jobs.length === 1 ? 'file' : 'files'} opened</strong>
					{/if}
				</p>
				<ul class="seal-list" aria-live="polite">
					{#each jobs as job (job.name)}<SealRow {job} onsave={() => (job.saved = true)} quietSave={unsavedCount > 1} />{/each}
				</ul>
				{#if finished}
					{#if !unsaved && jobs.every((j) => j.state === 'intact' && j.seal)}
						<p class="notice compare"><Icon name="check" size={18} />Every seal is intact. If the seal numbers match the sender's, you have exactly the files they sent.</p>
					{/if}
					{#if hasTorn}
						<p class="notice danger next">
							<Icon name="alert" size={18} />
							{#if tornStreamed}If part of a broken file was saved, delete it: it is incomplete.{:else}{tornCount === 1 ? "The broken file wasn't saved." : "The broken files weren't saved."}{/if}
							Ask the sender to send {tornCount === 1 ? 'it' : 'them'} again.
						</p>
					{/if}
					<ResultActions bind:jobs moreLabel="Decrypt more files" onrestart={startOver} quietMore={hasLocked}>
						{#if hasLocked}
							<button class={unsaved ? 'btn' : 'btn btn-primary'} type="button" onclick={retry}>{mode === 'key' ? 'Try other keys' : 'Try another password'}</button>
						{/if}
					</ResultActions>
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
	.notice.next {
		margin: 16px 0 0;
	}
	.notice.compare {
		margin: 16px 0 0;
	}
	.summary-line {
		color: var(--ink-2);
	}
	.checked {
		margin-bottom: 12px;
		border-radius: 5px;
	}
	.checked strong {
		font-weight: 600;
	}
</style>
