# Own versioned file format

lockbox uses well-established libsodium primitives (libsodium secretstream XChaCha20-Poly1305, Argon2id, X25519), but Lockbox files use their own versioned format with a `LOCKBOX` magic header and Argon2id parameters stored per file. Adopting another tool's undocumented format byte for byte would tie us to its choices forever; a versioned header lets us raise KDF costs or change chunking later without breaking old files. Consequence: lockbox reads only its own files, and the format must be documented in a spec because published files are hard to migrate.
