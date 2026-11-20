# lockbox

Encrypt and decrypt files in your browser with a password or a key pair. Nothing is uploaded: lockbox is a static site, and every byte of your file stays on your device. It works offline once loaded.

## How it works

- **Password mode:** Argon2id (256 MiB, 3 passes) turns the password into a key; the file is encrypted with XChaCha20-Poly1305 in 64 KiB chunks (libsodium `secretstream`).
- **Key mode:** X25519 key exchanges from a fresh per-file key and from the Sender's private key to the Recipient's public key. Decryption only succeeds with the real Sender's public key, so it proves who sent the file, and a Sender's key leaking later doesn't expose files already sent.
- **Tamper detection:** every chunk is authenticated and the header is bound to the first chunk. A changed, reordered or truncated file is rejected, and the app shows a broken seal.
- **Large files:** encryption runs in a Web Worker and output streams to disk through a service worker, so multi-gigabyte files never sit in memory. Without a service worker (e.g. Firefox private windows) output is held in memory, about 1 GB at most, and saved with a click.
- **Seal number:** a short public label from each file's header that helps sender and recipient tell files apart. It is not a fingerprint: integrity comes from decryption.

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

Sharing an AWS account with other projects? Every lockbox resource is tagged `Project=lockbox`, and the budget alert counts only that tag, so other workloads won't trip it. Activate `Project` under Billing → Cost allocation tags for the filter to take effect, or set `create_budget = false`. If you already deploy from GitHub Actions, set `create_github_oidc_provider = false` (an account can hold only one GitHub OIDC provider).

The deploy role trusts only the `production` environment of this repository. In GitHub, Settings → Environments → production, set **Deployment branches** to `main` only (and optionally add yourself as a required reviewer), so nothing but reviewed code on `main` can deploy.

Then in GitHub, Settings → Secrets and variables → Actions → Variables, add:

| Variable | Value |
|---|---|
| `AWS_REGION` | `us-east-1` (or the region you set) |
| `S3_BUCKET` | `terraform output -raw s3_bucket` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output -raw cloudfront_distribution_id` |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output -raw deploy_role_arn` |

### Custom domain (DNS in Cloudflare or elsewhere)

Set `domain_name = "lockbox.example.com"` in `terraform.tfvars`, then:

1. `terraform apply -target=aws_acm_certificate.site` creates the TLS certificate (in us-east-1, as CloudFront requires).
2. `terraform output certificate_validation_record`: add that CNAME in Cloudflare.
3. `terraform apply` waits for the certificate to be issued (usually minutes), then attaches the domain to CloudFront.
4. `terraform output site_dns_record`: add that CNAME in Cloudflare (a bare domain works too; Cloudflare flattens it).

Set both records to **DNS only** (grey cloud). Proxying through Cloudflare would put a second CDN, and a second TLS termination, in front of a privacy tool, and can break certificate validation. Share links pick up the new domain automatically.

Every push to `main` then tests, builds and deploys. The site is at `terraform output -raw site_url`.

## License

GPL-3.0. See [LICENSE](LICENSE).
