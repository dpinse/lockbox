export const MIN_PASSWORD_LENGTH = 12;

// 64 symbols, so `byte & 63` is uniform with no modulo bias.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** 20 random characters, 120 bits. */
export function generatePassword(length = 20) {
	const bytes = crypto.getRandomValues(new Uint8Array(length));
	return Array.from(bytes, (b) => ALPHABET[b & 63]).join('');
}

export type Strength = { score: 0 | 1 | 2 | 3 | 4; warning: string | null; crackTime: string };

let checker: Promise<(pw: string) => Strength> | null = null;

/** Lazy-loads the ~1 MB dictionaries on first use. */
export function estimateStrength(password: string): Promise<Strength> {
	checker ??= Promise.all([
		import('@zxcvbn-ts/core'),
		import('@zxcvbn-ts/language-common'),
		import('@zxcvbn-ts/language-en')
	]).then(([core, common, en]) => {
		const zxcvbn = new core.ZxcvbnFactory({
			translations: en.translations,
			graphs: common.adjacencyGraphs,
			dictionary: { ...common.dictionary, ...en.dictionary }
		});
		return (pw: string) => {
			const r = zxcvbn.check(pw);
			return {
				score: r.score,
				warning: r.feedback.warning,
				crackTime: r.crackTimes.offlineSlowHashingXPerSecond.display
			};
		};
	});
	return checker.then((check) => check(password));
}
