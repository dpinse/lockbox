output "site_url" {
  value = "https://${local.custom_domain ? var.domain_name : aws_cloudfront_distribution.site.domain_name}"
}

# Add both in Cloudflare (or any DNS host) with proxying OFF ("DNS only", grey cloud).
# Step 1 record: available after `terraform apply -target=aws_acm_certificate.site`.
output "certificate_validation_record" {
  value = local.custom_domain ? [for o in aws_acm_certificate.site[0].domain_validation_options : {
    type  = o.resource_record_type
    name  = o.resource_record_name
    value = o.resource_record_value
  }] : []
}

# Step 2 record: points the domain at CloudFront.
output "site_dns_record" {
  value = local.custom_domain ? {
    type  = "CNAME"
    name  = var.domain_name
    value = aws_cloudfront_distribution.site.domain_name
  } : null
}

# The next three go into the GitHub repository's Actions variables (Settings → Secrets and variables → Variables).
output "s3_bucket" {
  value = aws_s3_bucket.site.bucket
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "deploy_role_arn" {
  value = aws_iam_role.deploy.arn
}
