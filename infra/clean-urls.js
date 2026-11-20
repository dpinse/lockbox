// CloudFront Function (viewer request): serve /decrypt from /decrypt.html.
// Paths with a file extension, the root and the download URLs the service worker owns pass through untouched.
function handler(event) {
	var request = event.request;
	var uri = request.uri;
	if (uri === '/' || uri.indexOf('/lockbox-download/') === 0) return request;
	var last = uri.substring(uri.lastIndexOf('/') + 1);
	if (last.indexOf('.') === -1) {
		request.uri = uri.replace(/\/+$/, '') + '.html';
	}
	return request;
}
