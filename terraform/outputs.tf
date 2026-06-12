output "eks_cluster_name" {
  value       = module.eks.cluster_name
  description = "EKS Cluster Name"
}

output "eks_cluster_endpoint" {
  value       = module.eks.cluster_endpoint
  description = "EKS Cluster Endpoint URL"
}

output "eks_kubeconfig_command" {
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.aws_region}"
  description = "Command to configure kubectl to point to the cluster"
}

output "ecr_backend_url" {
  value       = module.ecr.backend_repository_url
  description = "ECR Repository URL for Backend Container"
}

output "ecr_frontend_url" {
  value       = module.ecr.frontend_repository_url
  description = "ECR Repository URL for Frontend Container"
}

output "rds_endpoint" {
  value       = module.rds.rds_endpoint
  description = "RDS MySQL Host Endpoint"
}

output "rds_port" {
  value       = module.rds.rds_port
  description = "RDS MySQL Connection Port"
}

output "elasticache_endpoint" {
  value       = module.elasticache.redis_endpoint
  description = "ElastiCache Redis Endpoint"
}

output "iot_core_endpoint" {
  value       = module.iot_core.iot_endpoint
  description = "AWS IoT Core Data ATS Endpoint"
}

output "sqs_queue_url" {
  value       = module.sqs.queue_url
  description = "SQS Main Sensor Queue URL"
}

output "sqs_queue_arn" {
  value       = module.sqs.queue_arn
  description = "SQS Main Sensor Queue ARN"
}

output "s3_reports_bucket" {
  value       = module.s3.reports_bucket_name
  description = "S3 Bucket storing PDF/CSV reports"
}

output "s3_raw_telemetry_bucket" {
  value       = module.s3.raw_telemetry_bucket_name
  description = "S3 Bucket storing raw MQTT telemetry JSON objects"
}

output "cloudfront_domain" {
  value       = module.cloudfront.cloudfront_domain_name
  description = "CloudFront Distribution Domain Name for Single Page React App"
}

output "route53_nameservers" {
  value       = module.route53.name_servers
  description = "Route53 Hosted Zone Name Servers"
}
