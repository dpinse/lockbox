<script lang="ts" module>
	export type JobStatus = { name: string; state: 'working' | 'done' | 'error'; bytes: number; message?: string };
</script>

<script lang="ts">
	let { jobs }: { jobs: JobStatus[] } = $props();
	const mb = (n: number) => (n / 1048576).toFixed(1);
</script>

{#if jobs.length}
	<ul aria-live="polite">
		{#each jobs as job (job.name)}
			<li>
				{job.name} —
				{#if job.state === 'working'}working… {mb(job.bytes)} MB
				{:else if job.state === 'done'}saved
				{:else}failed: {job.message}{/if}
			</li>
		{/each}
	</ul>
{/if}
