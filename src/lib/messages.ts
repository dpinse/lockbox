import type { ErrorCode } from './lockbox/format';

const PARTIAL = ' If a download started, delete it: it is incomplete.';

export const errorMessage: Record<ErrorCode | 'unknown', string> = {
	'not-lockbox': "This isn't a lockbox file.",
	'newer-version': 'This file was made by a newer version of lockbox.',
	invalid: 'This file is damaged or not a valid lockbox file.',
	'wrong-mode': 'This file was encrypted with a different mode.',
	'wrong-secret': 'Wrong password or key, or the file was altered.',
	altered: 'The file was altered or damaged.' + PARTIAL,
	incomplete: 'The file is incomplete.' + PARTIAL,
	unknown: 'Something went wrong.' + PARTIAL
};

export function today() {
	const d = new Date();
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
