<script lang="ts">
	import { onMount } from 'svelte';
	import PageNav from '#lib/components/PageNav.svelte';
	import Step from '#lib/components/Step.svelte';
	import DropZone from '#lib/components/DropZone.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import KeyField from '#lib/components/KeyField.svelte';
	import SealRow, { type SealJob } from '#lib/components/SealRow.svelte';
	import ResultActions from '#lib/components/ResultActions.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { JobError, runJob } from '#lib/lockbox/client.ts';
	import type { EncryptSecret } from '#lib/lockbox/format.ts';
	import { encodeKey, keyFromFragment, publicFromPrivate } from '#lib/lockbox/keys.ts';
	import InlineKeyPair from '#lib/components/InlineKeyPair.svelte';
	import { MIN_PASSWORD_LENGTH } from '#lib/password.ts';
	import { failureMessage, streaming, today } from '#lib/messages.ts';
	import { sealPulse } from '#lib/seal.svelte.ts';
	import { focusOnMount } from '#lib/focus.ts';

	let step = $state<1 | 2 | 3>(1);
	let files = $state<File[]>([]);
	let bundle = $state(false);
	let mode = $state<'password' | 'key'>('password');
	let password = $state('');
	let senderPrivateText = $state('');
	let senderPrivate = $state<Uint8Array | null>(null);
	let recipientPublicText = $state('');
	let recipientPublic = $state<Uint8Array | null>(null);
	let jobs = $state<SealJob[]>([]);
	let running = $state(false);
	let copied = $state(false);
	let sharedFor = $state(''); // recipient key that arrived in a share link
	let copiedPublic = $state(false);
	let cardPulse = $state(0);
	let pulsedOnSave = false;

	// The lid closes once the files are really on disk: at the end of a streamed run, or on the first Save.
	function seal() {
		sealPulse.count++;
		cardPulse++;
	}
	$effect(() => {
		if (!pulsedOnSave && jobs.some((j) => j.saved)) {
			pulsedOnSave = true;
			seal();
		}
	});

	onMount(() => {
		const shared = keyFromFragment(location.hash);
		if (shared) {
			mode = 'key';
			recipientPublicText = shared;
			sharedFor = shared;
		}
	});

	const willBundle = $derived(bundle && files.length > 1);
	const secretOk = $derived(mode === 'password' ? password.length >= MIN_PASSWORD_LENGTH : !!senderPrivate && !!recipientPublic);
	const finished = $derived(jobs.length > 0 && !running);
	const unsaved = $derived(jobs.some((j) => j.saveUrl && !j.saved));
	const sealedCount = $derived(jobs.filter((j) => j.state === 'sealed').length);
	const filesSummary = $derived(`${files.length} ${files.length === 1 ? 'file' : 'files'}${willBundle ? ', bundled' : ''}`);

	async function encrypt() {
		if (!files.length || !secretOk || running) return;
		const secret: EncryptSecret =
			mode === 'password' ? { password } : { senderPrivate: senderPrivate!, recipientPublic: recipientPublic! };
		const outputs = willBundle
			? [{ files: [...files], name: `lockbox-${today()}.zip.lockbox`, total: files.reduce((n, f) => n + f.size, 0) }]
			: files.map((f) => ({ files: [f], name: `${f.name}.lockbox`, total: f.size }));

		const streamed = streaming();
		running = true;
		jobs = outputs.map((o) => ({ name: o.name, seal: '', state: 'waiting', done: 0, total: o.total }));
		let sealedAny = false;
		for (const [i, o] of outputs.entries()) {
			jobs[i].state = 'working';
			try {
				const { saveUrl } = await runJob({ op: 'encrypt', files: o.files, bundle: willBundle, secret }, o.name, {
					onProgress: (b) => (jobs[i].done = b),
					onSeal: (s) => (jobs[i].seal = s)
				});
				jobs[i].state = 'sealed';
				jobs[i].saveUrl = saveUrl;
				jobs[i].message = saveUrl ? 'Sealed, not saved yet' : 'Saved to your downloads';
				sealedAny = true;
			} catch (err) {
				jobs[i].state = 'failed';
				jobs[i].message = failureMessage(err instanceof JobError ? err.code : 'unknown', streamed);
			}
		}
		running = false;
		if (sealedAny && !jobs.some((j) => j.saveUrl)) seal();
	}

	// The recipient needs the sender's public key to open a Key mode file.
	const senderPublicText = $derived(senderPrivate ? encodeKey('public', publicFromPrivate(senderPrivate)) : '');

	async function copyPublic() {
		await navigator.clipboard.writeText(senderPublicText);
		copiedPublic = true;
		setTimeout(() => (copiedPublic = false), 1600);
	}

	async function copyPassword() {
		await navigator.clipboard.writeText(password);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	function startOver() {
		for (const j of jobs) if (j.saveUrl) URL.revokeObjectURL(j.saveUrl); // free memory-held output
		files = [];
		bundle = false;
		password = '';
		jobs = [];
		pulsedOnSave = false;
		step = 1;
	}

	const stateOf = (n: number) => (step === n ? 'current' : step > n ? 'done' : 'todo');
	const editable = (n: 1 | 2) => (jobs.length ? undefined : () => (step = n));
</script>

<svelte:head><title>Encrypt files · lockbox</title></svelte:head>

<div class="page-head">
	<h1>Encrypt files</h1>
	<p>Lock files with a password or a key. It all happens on this device; nothing is uploaded.</p>
</div>

<PageNav />

<section class="card after-nav" aria-label="Encrypt files">
	<ol class="steps">
		<Step n={1} title="Choose files" state={stateOf(1)} summary={filesSummary} onedit={editable(1)} onsubmit={() => files.length && (step = 2)}>
			{#if sharedFor}
				<p class="notice for">
					<Icon name="key" size={18} />
					<span>You're encrypting for <span class="mono">{sharedFor.slice(0, 24)}…</span> Only the owner of that key can open these files.</span>
				</p>
			{/if}
			<DropZone bind:files label="Drag files here, or" />
			{#if files.length > 1}
				<label class="check">
					<input type="checkbox" bind:checked={bundle} />
					Bundle into one lockbox file
				</label>
			{/if}
			<div class="actions">
				<button class="btn btn-primary" type="submit" disabled={!files.length}>Next</button>
			</div>
		</Step>

		<Step n={2} title="Choose a password or key" state={stateOf(2)} summary={mode === 'password' ? 'Password' : 'Key'} onedit={editable(2)} onsubmit={() => secretOk && (step = 3)}>
			<Segmented label="Encrypt with" bind:value={mode} options={[{ value: 'password', label: 'Password' }, { value: 'key', label: 'Key' }]} />
			<div class="secret">
				{#if mode === 'password'}
					<PasswordField bind:value={password} mode="new" />
				{:else}
					<KeyField label="Recipient's public key" kind="public" hint={sharedFor && recipientPublicText === sharedFor ? 'Filled in from the link you opened.' : 'Only the person with the matching private key can open the file.'} bind:value={recipientPublicText} bind:key={recipientPublic} />
					<KeyField label="Your private key" kind="private" hint="Proves the file came from you. It never leaves this device." bind:value={senderPrivateText} bind:key={senderPrivate} />
					<InlineKeyPair oncreate={(text) => (senderPrivateText = text)} />
				{/if}
			</div>
			<div class="actions">
				<button class="btn" type="button" onclick={() => (step = 1)}>Back</button>
				<button class="btn btn-primary" type="submit" disabled={!secretOk}>Next</button>
			</div>
		</Step>

		<Step n={3} title={unsaved ? 'Save your files' : 'Encrypt and save'} state={stateOf(3)} complete={finished && !unsaved && jobs.every((j) => j.state === 'sealed')} onsubmit={encrypt}>
			{#if !jobs.length}
				<p class="summary-line">
					{willBundle
						? `${files.length} files will be bundled into one lockbox file`
						: `${files.length} ${files.length === 1 ? 'lockbox file' : 'lockbox files'} will be saved`}
					{mode === 'password' ? 'protected by your password.' : 'that only the recipient can open.'}
				</p>
				<div class="actions">
					<button class="btn" type="button" onclick={() => (step = 2)}>Back</button>
					<button class="btn btn-primary" type="submit">
						<Icon name="download" size={18} />Encrypt {willBundle ? 'bundle' : files.length === 1 ? 'file' : `${files.length} files`}
					</button>
				</div>
			{:else}
				{#if running || sealedCount}
					<div class="sealed" tabindex="-1" use:focusOnMount>
						<Logo size={40} pulse={cardPulse} />
						<p>
							{#if running}
								<strong>Sealing…</strong>
								Encrypting on this device.
							{:else}
								<strong>{sealedCount === 1 ? '1 file sealed' : `${sealedCount} files sealed`}</strong>
								{unsaved ? 'Save each one below to keep it.' : 'Only the right password or key can open it now.'}
							{/if}
						</p>
					</div>
				{/if}
				<ul class="seal-list" aria-live="polite">
					{#each jobs as job (job.name)}<SealRow {job} onsave={() => (job.saved = true)} />{/each}
				</ul>
				{#if finished}
					<p class="notice">
						<Icon name="key" size={18} />
						<span>
							{#if mode === 'password'}Send the password separately, for example by phone.{:else}Send your public key along with the file: the recipient needs it to open it.{/if}
							The recipient sees the same seal number when they open the file, so you can confirm it's the right one.
						</span>
					</p>
					{#if mode === 'key' && senderPublicText}
						<div class="your-key">
							<span class="mono">{senderPublicText}</span>
							<button class="btn" type="button" onclick={copyPublic}><Icon name={copiedPublic ? 'check' : 'copy'} size={18} />{copiedPublic ? 'Copied' : 'Copy your public key'}</button>
						</div>
					{/if}
					<ResultActions bind:jobs moreLabel="Encrypt more files" onrestart={startOver}>
						{#if mode === 'password'}
							<button class="btn" type="button" onclick={copyPassword}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy password'}</button>
						{/if}
					</ResultActions>
				{/if}
			{/if}
		</Step>
	</ol>
</section>

<style>
	.secret {
		margin-top: 18px;
	}
	.summary-line {
		color: var(--ink-2);
	}
	.notice {
		margin-top: 16px;
	}
	.for {
		margin-bottom: 14px;
	}
	.your-key {
		display: grid;
		gap: 8px;
		justify-items: start;
		margin-top: 10px;
	}
	.your-key .mono {
		width: 100%;
		padding: 10px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--line-strong);
		background: var(--field);
		word-break: break-all;
		user-select: all;
	}
	.sealed {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-bottom: 14px;
		color: var(--ink-2);
		font-size: 15px;
	}
	.sealed strong {
		display: block;
		color: var(--ink);
		font-weight: 600;
	}
</style>
