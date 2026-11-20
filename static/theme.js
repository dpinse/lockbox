// Apply a saved theme before first paint so there is no flash. Separate file so the CSP needs no inline script.
try {
	var t = localStorage.getItem('theme');
	if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {}
