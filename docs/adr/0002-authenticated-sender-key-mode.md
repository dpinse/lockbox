---
status: amended by ADR-0003
---

# Authenticated sender in Key mode

Key mode uses the Sender's Private key together with the Recipient's Public key (X25519 key exchange; a per-file ephemeral key was added by ADR 0003), so successful decryption proves the file came from that Sender. We chose this over the anonymous `age`-style model (ephemeral sender key, only the Recipient's Public key needed), which is simpler to use but proves nothing about origin. Consequence: the Recipient must have the Sender's Public key to decrypt, and the Sender must supply their own Private key to encrypt.
