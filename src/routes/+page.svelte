<script lang="ts">
	import { onMount } from 'svelte';
	import PageNav from '#lib/components/PageNav.svelte';
	import Step from '#lib/components/Step.svelte';
	import DropZone from '#lib/components/DropZone.svelte';
	import Segmented from '#lib/components/Segmented.svelte';
	import PasswordField from '#lib/components/PasswordField.svelte';
	import KeyField from '#lib/components/KeyField.svelte';
	import SealRow, { type SealJob } from '#lib/components/SealRow.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { JobError, runJob } from '#lib/lockbox/client.ts';
	import type { EncryptSecret } from '#lib/lockbox/format.ts';
	import { keyFromFragment } from '#lib/lockbox/keys.ts';
	import { MIN_PASSWORD_LENGTH } from '#lib/password.ts';
	import { errorMessage, today } from '#lib/messages.ts';
	import { sealPulse } from '#lib/seal.svelte.ts';

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

	onMount(() => {
		const shared = keyFromFragment(location.hash);
		if (shared) {
			mode = 'key';
			recipientPublicText = shared;
		}
	});

	const willBundle = $derived(bundle && files.length > 1);
	const secretOk = $derived(mode === 'password' ? password.length >= MIN_PASSWORD_LENGTH : !!senderPrivate && !!recipientPublic);
	const finished = $derived(jobs.length > 0 && !running);
	const filesSummary = $derived(`${files.length} ${files.length === 1 ? 'file' : 'files'}${willBundle ? ', bundled' : ''}`);

	async function encrypt() {
		if (!files.length || !secretOk || running) return;
		const secret: EncryptSecret =
			mode === 'password' ? { password } : { senderPrivate: senderPrivate!, recipientPublic: recipientPublic! };
		const outputs = willBundle
			? [{ files: [...files], name: `lockbox-${today()}.zip.lockbox`, total: files.reduce((n, f) => n + f.size, 0) }]
			: files.map((f) => ({ files: [f], name: `${f.name}.lockbox`, total: f.size }));

		running = true;
		jobs = outputs.map((o) => ({ name: o.name, seal: '', state: 'waiting', done: 0, total: o.total }));
		let sealedAny = false;
		for (const [i, o] of outputs.entries()) {
			jobs[i].state = 'working';
			try {
				await runJob({ op: 'encrypt', files: o.files, bundle: willBundle, secret }, o.name, {
					onProgress: (b) => (jobs[i].done = b),
					onSeal: (s) => (jobs[i].seal = s)
				});
				jobs[i].state = 'sealed';
				jobs[i].message = 'Saved to your downloads';
				sealedAny = true;
			} catch (err) {
				jobs[i].state = 'failed';
				jobs[i].message = errorMessage[err instanceof JobError ? err.code : 'unknown'];
			}
		}
		running = false;
		if (sealedAny) sealPulse.count++;
	}

	async function copyPassword() {
		await navigator.clipboard.writeText(password);
		copied = true;
		setTimeout(() => (copied = false), 1600);
	}

	function startOver() {
		files = [];
		bundle = false;
		password = '';
		jobs = [];
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
		<Step n={1} title="Choose files" state={stateOf(1)} summary={filesSummary} onedit={editable(1)}>
			<DropZone bind:files label="Drag files here, or" />
			{#if files.length > 1}
				<label class="check">
					<input type="checkbox" bind:checked={bundle} />
					Bundle into one lockbox file
				</label>
			{/if}
			<div class="actions">
				<button class="btn btn-primary" type="button" disabled={!files.length} onclick={() => (step = 2)}>Next</button>
			</div>
		</Step>

		<Step n={2} title="Choose a password or key" state={stateOf(2)} summary={mode === 'password' ? 'Password' : 'Key'} onedit={editable(2)}>
			<Segmented label="Encrypt with" bind:value={mode} options={[{ value: 'password', label: 'Password' }, { value: 'key', label: 'Key' }]} />
			<div class="secret">
				{#if mode === 'password'}
					<PasswordField bind:value={password} mode="new" />
				{:else}
					<KeyField label="Your private key" kind="private" hint="Proves the file came from you. It never leaves this device." bind:value={senderPrivateText} bind:key={senderPrivate} />
					<KeyField label="Recipient's public key" kind="public" hint="Only the person with the matching private key can open the file." bind:value={recipientPublicText} bind:key={recipientPublic} />
					<p class="hint">No keys yet? <a href="/keys">Create a key pair</a>.</p>
				{/if}
			</div>
			<div class="actions">
				<button class="btn" type="button" onclick={() => (step = 1)}>Back</button>
				<button class="btn btn-primary" type="button" disabled={!secretOk} onclick={() => (step = 3)}>Next</button>
			</div>
		</Step>

		<Step n={3} title="Encrypt and save" state={stateOf(3)} complete={finished && jobs.some((j) => j.state === 'sealed')}>
			{#if !jobs.length}
				<p class="summary-line">
					{willBundle
						? `${files.length} files will be bundled into one lockbox file`
						: `${files.length} ${files.length === 1 ? 'lockbox file' : 'lockbox files'} will be saved`}
					{mode === 'password' ? 'protected by your password.' : 'that only the recipient can open.'}
				</p>
				<div class="actions">
					<button class="btn" type="button" onclick={() => (step = 2)}>Back</button>
					<button class="btn btn-primary" type="button" onclick={encrypt}>
						<Icon name="download" size={18} />Encrypt {willBundle ? 'bundle' : files.length === 1 ? 'file' : `${files.length} files`}
					</button>
				</div>
			{:else}
				<ul class="seal-list" aria-live="polite">
					{#each jobs as job (job.name)}<SealRow {job} />{/each}
				</ul>
				{#if finished}
					<p class="notice">
						<Icon name="key" size={18} />
						<span>
							{#if mode === 'password'}Send the password separately from the file, for example by phone. Anyone with both can open it.{/if}
							The recipient will see the same seal number when they open the file, so you can both confirm it's the right one.
						</span>
					</p>
					<div class="actions">
						{#if mode === 'password'}
							<button class="btn" type="button" onclick={copyPassword}><Icon name={copied ? 'check' : 'copy'} size={18} />{copied ? 'Copied' : 'Copy password'}</button>
						{/if}
						<button class="btn btn-primary" type="button" onclick={startOver}>Encrypt more files</button>
					</div>
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
</style>
