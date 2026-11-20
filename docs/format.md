# Lockbox file format, version 1

This document is the contract for every Lockbox file. Anything that reads or writes `.lockbox` files must follow it exactly. See [ADR 0001](adr/0001-own-file-format.md) for why the format exists and [ADR 0002](adr/0002-authenticated-sender-key-mode.md) for the Key mode model.

All primitives come from libsodium. Integers are unsigned, little-endian.

## Layout

```
+------------------+----------------------+---------------------+-----------+-----+-----------+
| preamble (9 B)   | mode params (24/32 B)| stream header (24 B)| chunk 0   | ... | chunk N   |
+------------------+----------------------+---------------------+-----------+-----+-----------+
```

The **file header** is the preamble plus the mode params. It is authenticated (see [Header binding](#header-binding)).

### Preamble — 9 bytes

| Offset | Size | Field   | Value                                  |
|-------:|-----:|---------|----------------------------------------|
| 0      | 7    | magic   | ASCII `LOCKBOX` (`4C 4F 43 4B 42 4F 58`) |
| 7      | 1    | version | `0x01`                                 |
| 8      | 1    | mode    | `0x01` Password mode, `0x02` Key mode  |

### Mode params

**Password mode** (`0x01`) — 24 bytes:

| Offset | Size | Field    | Meaning                                       |
|-------:|-----:|----------|-----------------------------------------------|
| 9      | 16   | salt     | Random, `crypto_pwhash_SALTBYTES`             |
| 25     | 4    | opslimit | Argon2id iterations (u32)                     |
| 29     | 4    | memlimit | Argon2id memory in bytes (u32)                |

**Key mode** (`0x02`) — 32 bytes:

| Offset | Size | Field  | Meaning                                              |
|-------:|-----:|--------|------------------------------------------------------|
| 9      | 32   | eph_pk | Per-file ephemeral X25519 Public key (see Key mode)  |

The Sender and Recipient keys are supplied by the user and never stored in the file.

### Stream header — 24 bytes

The `crypto_secretstream_xchacha20poly1305` header produced by `init_push`. It is random per file, so two files encrypted with the same key never share a keystream.

### Chunks

The Original file is split into plaintext chunks of exactly **65,536 bytes** (64 KiB); only the last may be shorter. Each chunk is encrypted with `crypto_secretstream_xchacha20poly1305_push`, adding 17 bytes (`ABYTES`), so every encrypted chunk is 65,553 bytes except the last.

- Every chunk except the last uses `TAG_MESSAGE`.
- The last chunk uses `TAG_FINAL`.
- An empty Original file is encoded as one chunk of 0 plaintext bytes with `TAG_FINAL`.
- An Original file whose size is an exact multiple of 64 KiB ends with a full chunk tagged `TAG_FINAL` (no trailing empty chunk). Encoders must read ahead to know which chunk is last.

## Header binding

Chunk 0 is pushed with the full file header (preamble + mode params) as additional data. Decryption of chunk 0 passes the same bytes. Any change to the magic, version, mode, salt, Argon2id parameters, or ephemeral key makes chunk 0 fail to decrypt. Later chunks use no additional data; secretstream already chains them.

## Deriving the stream key

### Password mode

1. Normalize the password to Unicode **NFC**, then encode as UTF-8. (The same password typed on different systems must give the same bytes.)
2. `key = crypto_pwhash(32, password, salt, opslimit, memlimit, crypto_pwhash_ALG_ARGON2ID13)`

Encoders write `opslimit = 3` and `memlimit = 268435456` (libsodium's `MODERATE`). Passwords shorter than 12 characters are refused by the app before encryption; the format itself does not enforce this.

Decoders read parameters from an untrusted file, so they must enforce limits **before** running Argon2id:

| Field    | Accept if                                 |
|----------|-------------------------------------------|
| opslimit | `crypto_pwhash_OPSLIMIT_MIN` ≤ value ≤ 16 |
| memlimit | 8 MiB ≤ value ≤ 1 GiB                     |

Anything outside is rejected as an invalid file, so a crafted file cannot freeze the browser.

### Key mode

An ephemeral–static plus static–static X25519 exchange (see [ADR 0003](adr/0003-ephemeral-key-in-key-mode.md)). `DH(a, B)` is `crypto_scalarmult(a, B)`; implementations must reject an all-zero result (libsodium does).

Sender:

1. Generate a fresh X25519 key pair `(eph_sk, eph_pk)` for this file and write `eph_pk` into the mode params.
2. `es = DH(eph_sk, recipient_pk)` and `ss = DH(sender_sk, recipient_pk)`, where `sender_pk = crypto_scalarmult_base(sender_sk)`.
3. Erase `eph_sk` after deriving the key. It is never stored.

Recipient:

1. Read `eph_pk` from the mode params.
2. `es = DH(recipient_sk, eph_pk)` and `ss = DH(recipient_sk, sender_pk)`, where `recipient_pk = crypto_scalarmult_base(recipient_sk)`.

Both: `key = BLAKE2b-256( "lockbox key mode v1" ‖ es ‖ ss ‖ eph_pk ‖ sender_pk ‖ recipient_pk )` (`crypto_generichash`, unkeyed; the label is its 19 ASCII bytes).

The Recipient must supply the Sender's Public key; decryption succeeds only if it matches the Sender's Private key used to encrypt (`ss`). That is what makes the Sender authenticated. `eph_pk` sits in the file header, so header binding also covers it.

Known properties, accepted for v1:

- **Sender-side forward secrecy.** A Sender's Private key leaking later does not expose files they already sent: opening one also needs `eph_sk`, which was erased, or the Recipient's Private key.
- **No Recipient-side forward secrecy.** Whoever holds the Recipient's Private key can open every file sent to it. This is inherent to files read long after they are sent; rotating Key pairs limits the exposure.
- **Key compromise impersonation.** Whoever holds the Recipient's Private key can forge files that appear to come from any Sender, to that Recipient.

## Decoding and errors

A decoder must stop and report the first failure. It must never hand partially decrypted output to the user as if it were complete.

| Condition                                                    | Error            |
|--------------------------------------------------------------|------------------|
| Fewer than 9 bytes, or magic is not `LOCKBOX`                | Not a Lockbox file |
| Version is not `0x01`                                        | Made by a newer lockbox |
| Mode unknown, or Argon2id parameters outside the limits      | Invalid file     |
| Chunk 0 fails to decrypt                                     | Wrong password or key, or the file was altered |
| A later chunk fails to decrypt                               | File was altered |
| End of file reached before a `TAG_FINAL` chunk               | File is incomplete |
| Any bytes after the `TAG_FINAL` chunk                        | File was altered |
| File header or stream header cut short                       | File is incomplete |

A file cut in the middle of a chunk fails that chunk's authentication and is reported as altered; decoders cannot tell truncation from tampering there, and need not.

Because the output is streamed to disk, a failure after chunk 0 can leave a partial file. The app must tell the user decryption failed and that the saved output is incomplete.

## Text encodings

### Keys

Keys are 32 raw bytes, written as a prefix plus base64url without padding (43 characters):

| Key         | Text form                    |
|-------------|------------------------------|
| Public key  | `lockbox-pub-<base64url>`    |
| Private key | `lockbox-priv-<base64url>`   |

Parsers reject text with the wrong prefix, so pasting a Private key into a Public key field is caught. The Public key can be recomputed from the Private key with `crypto_scalarmult_base`.

### Share link

A Public key is shared as `https://<host>/#to=lockbox-pub-<base64url>`. The key sits in the URL fragment, which browsers never send to the server.

### Seal number

The app labels each Lockbox file with its seal number: the first 4 bytes of the stream header as uppercase hex, split in two (`4F2A·91C0`). It is public and random per file, and helps a Sender and Recipient tell files apart. It is not bound to the contents: anyone who can decrypt a file can build a different one with the same seal number. It proves nothing about integrity; decryption does that.

## File names

- Encrypting `<name>` produces `<name>.lockbox`. The Original file name is not stored inside.
- Decrypting `<name>.lockbox` produces `<name>`. Without the suffix, the output is named `<name>.decrypted`.
- A Bundle is an uncompressed (stored) zip of the Original files, encrypted as one ordinary Lockbox file named `lockbox-YYYY-MM-DD.zip.lockbox`. The format does not distinguish Bundles; it decrypts to the `.zip`.

## Versioning

Any change to the layout, chunk size, header binding, or key derivation requires a new version byte. Decoders keep support for every older version they have shipped. Raising the Argon2id defaults within the accepted limits does not need a new version.
