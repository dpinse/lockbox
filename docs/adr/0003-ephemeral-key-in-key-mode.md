---
status: accepted
---

# Per-file ephemeral key in Key mode

Amends [ADR 0002](0002-authenticated-sender-key-mode.md). Key mode originally derived the file key from the Sender's and Recipient's long-term keys alone (`crypto_kx`), so a Sender's Private key leaking later would expose every file they had sent. Each file now also carries a fresh ephemeral X25519 Public key, and the key is BLAKE2b over both the ephemeral–Recipient and the Sender–Recipient exchanges plus all three public keys. This gives sender-side forward secrecy while keeping sender authentication, at the cost of 32 header bytes. We made the change before v1 shipped because it alters the file format: once Lockbox files exist, it would need a new format version supported forever.

Considered options: anonymous ephemeral-only (`age`-style) loses sender authentication, which ADR 0002 chose deliberately; a signature over the file adds a second key type and more user-facing key handling. Recipient-side forward secrecy is not achievable for files opened long after sending without prekeys and key deletion, which do not fit a static, account-less tool; Key pair rotation is the mitigation.
