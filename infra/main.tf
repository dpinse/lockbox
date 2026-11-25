# lockbox hosting: private S3 bucket behind CloudFront on the free flat-rate plan, AWS's managed security headers,
# and a keyless GitHub Actions deploy role.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  # shortcut: local state file; move to an S3 backend before more than one person runs this.
}

provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = var.project }
  }
}

# CloudFront only accepts certificates issued in us-east-1, whatever region the bucket is in.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
  default_tags {
    tags = { Project = var.project }
  }
}

locals {
  custom_domain = var.domain_name != ""
}

# ---------- Custom domain (optional; DNS stays wherever it is, e.g. Cloudflare) ----------

resource "aws_acm_certificate" "site" {
  count             = local.custom_domain ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Waits until the validation CNAME (see the dns_records output) exists in your DNS.
resource "aws_acm_certificate_validation" "site" {
  count                   = local.custom_domain ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for o in aws_acm_certificate.site[0].domain_validation_options : o.resource_record_name]
}

data "aws_caller_identity" "current" {}

# ---------- Storage ----------

resource "aws_s3_bucket" "site" {
  bucket_prefix = "${var.project}-site-"
  force_destroy = true # contents are a build artefact; CI can always re-upload them
}

resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Only this CloudFront distribution may read the bucket.
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "CloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = { StringEquals = { "AWS:SourceArn" = aws_cloudfront_distribution.site.arn } }
    }]
  })
  depends_on = [aws_s3_bucket_public_access_block.site]
}

# ---------- CDN ----------

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.project}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# /decrypt -> /decrypt.html (adapter-static writes one .html file per prerendered page).
resource "aws_cloudfront_function" "clean_urls" {
  name    = "${var.project}-clean-urls"
  runtime = "cloudfront-js-2.0"
  publish = true
  code    = file("${path.module}/clean-urls.js")
}

# CloudFront's free flat-rate plan (no overage charges, see the billing plan below) only allows AWS's managed
# header policies, so this is theirs, not ours: HSTS for a year, nosniff, X-Frame-Options SAMEORIGIN, and a
# referrer policy. The page's own <meta> CSP (generated at build with script hashes) does the heavy lifting.
# Given up to get the cap: Permissions-Policy, Cross-Origin-Opener-Policy, and frame-ancestors 'none'.
data "aws_cloudfront_response_headers_policy" "security" {
  name = "Managed-SecurityHeadersPolicy"
}

# The flat-rate plan requires a web ACL on the distribution and covers its cost. One rule: block any single
# address that sends more than 500 requests in five minutes (a full page load is a few dozen at most).
resource "aws_wafv2_web_acl" "site" {
  provider = aws.us_east_1 # CloudFront web ACLs live in us-east-1
  name     = "${var.project}-site"
  scope    = "CLOUDFRONT"

  default_action {
    allow {}
  }

  rule {
    name     = "rate-limit"
    priority = 1

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "${var.project}-rate-limit"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project}-site"
    sampled_requests_enabled   = true
  }
}

data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  comment             = "lockbox static site"
  default_root_object = "index.html"
  price_class         = var.price_class
  http_version        = "http2and3"
  is_ipv6_enabled     = true
  aliases             = local.custom_domain ? [var.domain_name] : []
  web_acl_id          = aws_wafv2_web_acl.site.arn

  origin {
    origin_id                = "s3-site"
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = "s3-site"
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.clean_urls.arn
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = !local.custom_domain
    acm_certificate_arn            = local.custom_domain ? aws_acm_certificate_validation.site[0].certificate_arn : null
    ssl_support_method             = local.custom_domain ? "sni-only" : null
    # The default *.cloudfront.net certificate only allows "TLSv1"; a custom certificate can require TLS 1.2+.
    minimum_protocol_version = local.custom_domain ? "TLSv1.2_2021" : "TLSv1"
  }
}

# ---------- Billing plan ----------

# CloudFront's free flat-rate plan: no overage charges, so a flood of requests cannot run up a bill.
# It needs the web ACL above and only AWS-managed header policies. An account allows three free plans,
# and accounts on the AWS Free Tier are not eligible; delete this resource to stay on pay-as-you-go.
resource "aws_pricingplanmanager_subscription" "site" {
  provider      = aws.us_east_1
  plan_family   = "CloudFront"
  plan_tier     = "FREE"
  resource_arns = [aws_cloudfront_distribution.site.arn, aws_wafv2_web_acl.site.arn]
}

# ---------- Keyless deploys from GitHub Actions ----------

resource "aws_iam_openid_connect_provider" "github" {
  count          = var.create_github_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

locals {
  github_oidc_arn = var.create_github_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : "arn:aws:iam::${data.aws_caller_identity.current.account_id}:oidc-provider/token.actions.githubusercontent.com"
}

resource "aws_iam_role" "deploy" {
  name = "${var.project}-github-deploy"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Jobs that declare `environment:` get this subject instead of a branch ref. Only this repository's
          # deploy environment qualifies; restrict that environment to main in GitHub settings.
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:environment:${var.github_environment}"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.site.arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.site.arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.site.arn
      }
    ]
  })
}
