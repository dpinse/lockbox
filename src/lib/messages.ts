import type { ErrorCode } from './lockbox/format';

export const errorMessage: Record<ErrorCode | 'unknown', string> = {
	'not-lockbox': "This isn't a lockbox file.",
	'newer-version': 'This file was made by a newer version of lockbox.',
	invalid: 'This file is damaged or not a valid lockbox file.',
	'wrong-mode': 'This file was encrypted with a different mode.',
	'wrong-secret': "Couldn't open it: wrong password or key, or the file was changed after sealing.",
	altered: 'The file was altered or damaged.',
	incomplete: 'The file is incomplete.',
	unknown: 'Something went wrong.'
};

/**
 * Message for a failed job. A streamed download may already have written part of the file to disk;
 * memory-held output is simply discarded, so only the streamed case gets the warning.
 */
export function failureMessage(code: ErrorCode | 'unknown', streamed: boolean) {
	const partial = streamed && (code === 'altered' || code === 'incomplete' || code === 'unknown');
	return errorMessage[code] + (partial ? ' A partial download may have started: delete it.' : '');
}

/** True when output will stream to disk through the service worker rather than wait in memory. */
export const streaming = () => !!navigator.serviceWorker?.controller;

export function today() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
