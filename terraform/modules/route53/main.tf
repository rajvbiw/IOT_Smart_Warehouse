resource "aws_route53_zone" "primary" {
  count = (var.domain_name == "" || length(regexall("example.com", var.domain_name)) > 0) ? 0 : 1
  name  = var.domain_name
}

resource "aws_route53_record" "apex" {
  count   = (var.domain_name == "" || length(regexall("example.com", var.domain_name)) > 0) ? 0 : 1
  zone_id = aws_route53_zone.primary[0].zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "wildcard" {
  count   = (var.domain_name == "" || length(regexall("example.com", var.domain_name)) > 0) ? 0 : 1
  zone_id = aws_route53_zone.primary[0].zone_id
  name    = "*.${var.domain_name}"
  type    = "A"

  alias {
    name                   = var.alb_dns_name
    zone_id                = var.alb_zone_id
    evaluate_target_health = true
  }
}

variable "domain_name" {}
variable "alb_dns_name" { default = "dummy-alb-12345.ap-south-1.elb.amazonaws.com" }
variable "alb_zone_id" { default = "Z35SXDOTRQ7X7K" }

output "zone_id" { value = length(aws_route53_zone.primary) > 0 ? aws_route53_zone.primary[0].zone_id : "" }
output "name_servers" { value = length(aws_route53_zone.primary) > 0 ? aws_route53_zone.primary[0].name_servers : [] }
