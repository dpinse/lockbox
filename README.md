# lockbox

Encrypt and decrypt files in your browser with a password or a key pair. Nothing is uploaded: lockbox is a static site, and every byte of your file stays on your device. It works offline once loaded.

Inspired by [hat.sh](https://github.com/sh-dv/hat.sh); a clean rewrite with its own file format.

## How it works

- **Password mode:** Argon2id (256 MiB, 3 passes) turns the password into a key; the file is encrypted with XChaCha20-Poly1305 in 64 KiB chunks (libsodium `secretstream`).
- **Key mode:** X25519 key exchange between the Sender's private key and the Recipient's public key. Decryption only succeeds with the real Sender's public key, so it proves who sent the file.
- **Tamper detection:** every chunk is authenticated and the header is bound to the first chunk. A changed, reordered or truncated file is rejected, and the app shows a broken seal.
- **Large files:** encryption runs in a Web Worker and output streams to disk through a service worker, so multi-gigabyte files never sit in memory. Without a service worker (e.g. Firefox private windows) output is held in memory, about 1 GB at most, and saved with a click.
- **Seal number:** a short public code from each file's header, so sender and recipient can confirm they hold the same file.

The exact byte layout is in [docs/format.md](docs/format.md); design decisions are in [docs/adr/](docs/adr/).

## Develop

```sh
npm install
npm run dev          # local dev server
npm test             # unit tests (format, crypto, keys)
npm run test:e2e     # browser tests (Playwright: Chromium, Firefox, WebKit)
npm run check        # type check
npm run build        # static site in build/
```

## Deploy (AWS S3 + CloudFront)

Infrastructure is Terraform in [infra/](infra/): a private S3 bucket, CloudFront with security headers, a URL-rewrite function, a GitHub Actions deploy role (OIDC, no stored keys) and a monthly budget alert. Expected cost for a personal site is about $0–1/month.

One-time setup, with the AWS CLI logged in:

```sh
cd infra
cp terraform.tfvars.example terraform.tfvars   # set budget_email
terraform init
terraform apply
```

Then in GitHub, Settings → Secrets and variables → Actions → Variables, add:

| Variable | Value |
|---|---|
| `AWS_REGION` | `us-east-1` (or the region you set) |
| `S3_BUCKET` | `terraform output -raw s3_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |

Every push to `main` then tests, builds and deploys. The site is at `terraform output -raw site_url`.

## License

GPL-3.0. See [LICENSE](LICENSE).
