# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: someone who needs to protect a real file, either sending it to another person or storing it safely. They arrive with a file in hand and want it done quickly and correctly. They may be non-technical, and many will be strangers who have never heard of lockbox.

Secondary: people reaching lockbox from the owner's resume, judging the quality of the work. When their interests conflict with the primary user's, the primary user wins; craft is shown through how well the tool works.

The owner is also a regular user.

## Product Purpose

Encrypt and decrypt files entirely in the browser, with a password or a key pair, so a file can be sent or stored without anyone else being able to read it. Success: a first-time visitor encrypts a file correctly without help, and the recipient decrypts it without confusion.

## Positioning

Nothing leaves the device: no upload, no account, no server processing. It is a static site that works offline once loaded. Key mode proves who sent a file, not only who can open it.

## Operating Context

- One-off tasks: open the page, drop a file, choose a password or keys, download the result, close the tab.
- Sender and Recipient are usually different people, on different devices, and coordinate outside lockbox (sharing a password verbally, sending a public key or share link by message).
- Desktop browsers are the main setting; mobile works, but Safari and mobile browsers cap files at about 1 GB.
- Files may be very large (gigabytes); output streams to disk.

## Capabilities and Constraints

- Password mode and Key mode; several files at once; optional Bundle into one Lockbox file; password generator with strength estimate; Key pair generation with share link and QR code.
- Passwords must be at least 12 characters.
- lockbox never stores keys or passwords. A lost Private key or password cannot be recovered.
- A wrong password or key is reported before any download starts. A failure partway through a large file can leave an incomplete download, and the user must be told to delete it.
- English only.
- Vocabulary is defined in GLOSSARY.md (Lockbox file, Original file, Bundle, Password mode, Key mode, Sender, Recipient, Key pair, Public key, Private key). UI verbs are plain Encrypt and Decrypt.

## Brand Commitments

- Name: lockbox, written lowercase.
- Logo: a treasure box. The treasure box appears only in the logo and one lid-closing animation when a file is encrypted; it is not a theme applied across the interface.
- Voice: plain and calm. Short, direct, reassuring copy. Personality stays in the logo and the animation, not the words.
- Visible credit to hat.sh, which inspired lockbox.
- Light and dark themes, following the system setting, with a manual toggle.

## Evidence on Hand

- Format spec: docs/format.md. Decisions: docs/adr/.
- No testimonials, users, audits, or press exist. Do not claim a security audit, user counts, or endorsements.

## Product Principles

1. The task comes first: a file in, a protected file out, with as few decisions as possible.
2. Never leave the user unsure whether it worked. Every outcome, especially failure, is stated plainly.
3. Earn trust through restraint and accuracy, not reassurance badges or security theater.
4. Make irreversible things obvious: losing a password or Private key means losing the file.

## Accessibility & Inclusion

No formal standard committed; best effort on contrast, keyboard use, screen readers, and reduced motion.
