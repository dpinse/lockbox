# Open items

Known gaps to address later, most important first. Each entry says what is wrong, why it matters, and the proposed fix. Accepted design limits that will not change are listed separately at the end.

## Security

### 1. No key commitment (needs a v2 format)
- **What:** XChaCha20-Poly1305 does not commit to its key. A malicious Sender can build one Lockbox file whose first chunk authenticates under two different keys (two passwords, or two Key mode Recipients), so it opens to different contents for different people. Both see the same seal number, because the seal fingerprints the ciphertext.
- **Why it matters:** only when several recipients compare what they received. The attacker must be the Sender.
- **Fix:** in format v2, store a key commitment in the header (e.g. BLAKE2b of the stream key with its own label) and check it before decrypting chunk 0. Bump the version byte; keep v1 decoding.
- **Source:** cold crypto review, Finding 1 (multi-key collision, "invisible salamanders").

### 2. A streamed decrypt can leave an authentic but truncated prefix on disk
- **What:** with the service-worker sink, each chunk is written to the download as soon as it verifies. A file cut at a chunk boundary is only detected at the end (no `TAG_FINAL`), after earlier chunks are already in the browser's download. Whether the browser then deletes, keeps (`.crdownload`/`.part`) or finalises the partial file is not verified.
- **Why it matters:** cutting a script, CSV or list of instructions part-way can change its meaning, and the prefix is genuine.
- **Mitigation today:** the decrypt page tells the user to delete any partial file after every mid-stream failure.
- **Fix:** decrypt files below a size threshold (e.g. 256 MB) in memory and release output only after `TAG_FINAL`; stream only above the threshold. Then test how Chrome, Firefox and Safari treat an errored service-worker download.
- **Source:** cold crypto review, Finding 2.

### 3. Security fixes reach users late
- **What:** the service worker serves the app from cache and an update waits until every lockbox tab is closed.
- **Fix:** detect a waiting service worker and show "An update is ready" with a reload button.

### 4. Get an outside cryptographic review
- **What:** the Key mode derivation (ephemeral–static plus static–static X25519, hashed with BLAKE2b) and the format are our own composition of libsodium primitives, reviewed only by AI agents so far.
- **Fix:** ask a human cryptographer to review `docs/format.md`, `src/lib/lockbox/format.ts` and `keys.ts` before inviting strangers to rely on Key mode.

### 5. The crypto worker has no script-src limits
- **What:** the worker's script only gets the CloudFront header CSP (frame-ancestors, object-src, base-uri), not the page's meta CSP.
- **Why it matters:** hardening only; it matters only if code is already compromised.
- **Fix:** serve the worker script with a `Content-Security-Policy` header including `script-src 'self' 'wasm-unsafe-eval'` and `connect-src 'none'` (a CloudFront behaviour for `/_app/immutable/workers/*`).

## Testing gaps

- **WebKit / Safari:** never run locally (Playwright's WebKit needs Ubuntu libraries). It first runs in CI.
- **Very large files:** nothing over about 200 KB has been tested. Unverified: that the service worker stays alive through a multi-gigabyte download, and the roughly 1 GB cap on Safari and mobile.
- **Leave-page warnings:** the `beforeunload` guards (unsaved results, unsaved private keys) are not covered by automated tests; headless browsers don't show the prompt.
- **Real screen reader, 200% zoom, forced-colours mode:** checked through the DOM and focus only.
- **Infrastructure:** `terraform validate` and `fmt` pass, but no `plan` or `apply` has run against a real account.

## Design (from the last /impeccable critique, 29/40)

- **No guidance at the Password | Key choice:** nothing explains when to pick which.
- **No help for a recipient:** someone who receives a `.lockbox` file and has never heard of lockbox gets no explanation.
- **"This isn't a lockbox file."** gives no next step.
- **Keys page lacks the Encrypt | Decrypt switch:** the only ways back are the logo and the post-save link.
- **Signature moment is small:** the results chest is 40px and drawn closed; consider drawing it open until the files are saved.
- **The filled drop zone reads as a card inside a card:** solid border around the file list.
- **Result screens are still busy:** several buttons and notes at once on the in-memory Save path and in Key mode.

## Operations

- **Terraform state is local** (`infra/terraform.tfstate`). Move it to an S3 backend before anyone else runs `terraform apply`.
- **JavaScript bundle is over 500 KB,** mostly libsodium. Consider lazy-loading it, or the standard (non-sumo) build if Argon2id can come from elsewhere.

## Accepted limits (documented, not planned)

- **No Recipient-side forward secrecy:** whoever holds a Recipient's private key can open every file sent to it. Inherent to files opened long after sending; rotating key pairs limits exposure.
- **Key compromise impersonation:** whoever holds a Recipient's private key can forge files that appear to come from any Sender, to that Recipient.
- **Password strength is the user's:** Argon2id slows guessing, but a weak password is still weak. The 12-character minimum and strength meter only advise.
