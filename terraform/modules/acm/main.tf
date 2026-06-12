resource "aws_acm_certificate" "cert" {
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

output "certificate_arn" { value = aws_acm_certificate.cert.arn }
