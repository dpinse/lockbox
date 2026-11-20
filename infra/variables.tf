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
  description = "owner/name of the GitHub repository allowed to deploy."
  type        = string
  default     = "dpinse/lockbox"
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

variable "create_budget" {
  description = "Create a monthly budget alert scoped to this project's tagged resources."
  type        = bool
  default     = true
}

variable "budget_email" {
  description = "Where budget alerts are sent (unused when create_budget is false)."
  type        = string
  default     = ""

  validation {
    condition     = !var.create_budget || length(var.budget_email) > 3
    error_message = "Set budget_email, or set create_budget = false."
  }
}

variable "budget_limit_usd" {
  description = "Monthly spend that triggers alerts (80% actual, 100% forecast)."
  type        = string
  default     = "5"
}

variable "domain_name" {
  description = "Optional custom domain, e.g. lockbox.example.com. Empty uses the *.cloudfront.net address."
  type        = string
  default     = ""
}

variable "price_class" {
  description = "CloudFront edge locations: PriceClass_100 (NA/EU, cheapest), _200, or _All."
  type        = string
  default     = "PriceClass_100"
}
