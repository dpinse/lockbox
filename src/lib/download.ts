/** Saves text as a file. Call from a click handler: browsers drop downloads that start without one. */
export function downloadText(filename: string, text: string) {
	const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
	const a = Object.assign(document.createElement('a'), { href: url, download: filename });
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
