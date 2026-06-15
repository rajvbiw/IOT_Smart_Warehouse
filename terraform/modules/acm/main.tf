resource "aws_acm_certificate" "cert" {
  count             = (var.domain_name == "" || length(regexall("example.com", var.domain_name)) > 0) ? 0 : 1
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = [
    "*.${var.domain_name}"
  ]

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-acm"
  }
}

variable "project_name" {}
variable "domain_name" {}

output "certificate_arn" { value = length(aws_acm_certificate.cert) > 0 ? aws_acm_certificate.cert[0].arn : "" }
