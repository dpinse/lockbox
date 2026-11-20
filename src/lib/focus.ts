/**
 * Svelte action: focus an element when it appears. Used where an action replaces the control that had
 * focus (results replacing the Encrypt button, a confirm replacing its trigger), so keyboard and
 * screen-reader users land on what just changed instead of the top of the page.
 */
export function focusOnMount(node: HTMLElement) {
	node.focus();
}
