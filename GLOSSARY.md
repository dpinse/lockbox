# Lockbox

A browser-only tool for encrypting and decrypting files with a password or a key pair. Nothing leaves the user's device.

## Language

### Files

**Lockbox file**:
The encrypted output of lockbox, carrying the `.lockbox` extension.
_Avoid_: Encrypted file, ciphertext file, box

**Bundle**:
A single Lockbox file holding several Original files packed together, which decrypts to one zip.
_Avoid_: Archive, batch

**Original file**:
The user's file before encryption or after successful decryption.
_Avoid_: Plaintext file, source file

### Modes

**Password mode**:
Encrypting or decrypting with a password the user chooses or generates.
_Avoid_: Symmetric mode, passphrase mode

**Key mode**:
Encrypting from a Sender to a Recipient using their key pairs, so only the Recipient can decrypt and decryption proves who the Sender was.
_Avoid_: Public-key mode, asymmetric mode

### People and keys

**Sender**:
The person who encrypts a Lockbox file in Key mode.

**Recipient**:
The person a Lockbox file in Key mode is encrypted for.

**Key pair**:
A matching Public key and Private key belonging to one person.
_Avoid_: Keys, identity

**Public key**:
The half of a Key pair that is shared openly, as text, QR code, or link.

**Private key**:
The half of a Key pair that its owner never shares; lockbox never stores it.
_Avoid_: Secret key
