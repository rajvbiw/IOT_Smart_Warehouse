resource "aws_route53_zone" "primary" {
  name = var.domain_name
}

resource "aws_route53_record" "apex" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "wildcard" {
  zone_id = aws_route53_zone.primary.zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

variable "domain_name" {}
variable "alb_dns_name" { default = "dummy-alb-12345.us-east-1.elb.amazonaws.com" }
variable "alb_zone_id" { default = "Z35SXDOTRQ7X7K" }

output "zone_id" { value = aws_route53_zone.primary.zone_id }
output "name_servers" { value = aws_route53_zone.primary.name_servers }
