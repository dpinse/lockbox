variable "project" {
  description = "Name prefix for every resource."
  type        = string
  default     = "lockbox"
}

variable "region" {
  description = "Region for the S3 bucket. CloudFront itself is global."
  type        = string
  default     = "us-east-1"
}

variable "github_repo" {
  description = "Repository as it appears in GitHub's OIDC subject: owner@ownerId/name@repoId (check CloudTrail AssumeRoleWithWebIdentity if unsure)."
  type        = string
  default     = "dpinse@17935575/lockbox@1464953078"
}

variable "github_environment" {
  description = "GitHub Actions environment the deploy job runs in (must match `environment:` in ci.yml)."
  type        = string
  default     = "production"
}

variable "create_github_oidc_provider" {
  description = "Set false if this AWS account already has the token.actions.githubusercontent.com OIDC provider."
  type        = bool
  default     = true
}

variable "domain_name" {
  description = "Optional custom domain, e.g. lockbox.example.com. Empty uses the *.cloudfront.net address."
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront edge locations. The flat-rate plan sets PriceClass_All and has no per-GB price, so leave this unless you drop the plan."
  type        = string
  default     = "PriceClass_All"
}
