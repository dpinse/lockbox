output "site_url" {
  value = "https://${aws_cloudfront_distribution.site.domain_name}"
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
