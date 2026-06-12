terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "vpc" {
  source       = "./modules/vpc"
  aws_region   = var.aws_region
  project_name = var.project_name
}

module "ecr" {
  source       = "./modules/ecr"
  project_name = var.project_name
}

module "eks" {
  source             = "./modules/eks"
  project_name       = var.project_name
  private_subnets    = module.vpc.private_subnets
  node_instance_type = var.eks_node_instance_type
  desired_nodes      = var.eks_desired_nodes
  min_nodes          = var.eks_min_nodes
  max_nodes          = var.eks_max_nodes
}

module "rds" {
  source          = "./modules/rds"
  project_name    = var.project_name
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  instance_class  = var.rds_instance_class
}

module "elasticache" {
  source          = "./modules/elasticache"
  project_name    = var.project_name
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

module "secrets_manager" {
  source = "./modules/secrets_manager"
}

module "s3" {
  source       = "./modules/s3"
  project_name = var.project_name
}

module "sqs" {
  source       = "./modules/sqs"
  project_name = var.project_name
}

module "iam" {
  source               = "./modules/iam"
  project_name         = var.project_name
  oidc_provider_arn    = module.eks.oidc_provider_arn
  oidc_issuer          = module.eks.oidc_issuer
  reports_bucket       = module.s3.reports_bucket_name
  raw_telemetry_bucket = module.s3.raw_telemetry_bucket_name
  sqs_queue_arn        = module.sqs.queue_arn
}

module "lambda" {
  source        = "./modules/lambda"
  project_name  = var.project_name
  aws_region    = var.aws_region
  sqs_queue_url = module.sqs.queue_url
  sqs_queue_arn = module.sqs.queue_arn
}

module "iot_core" {
  source                    = "./modules/iot_core"
  project_name              = var.project_name
  device_count              = var.iot_device_count
  lambda_arn                = module.lambda.lambda_arn
  sqs_queue_url             = module.sqs.queue_url
  raw_telemetry_bucket_name = module.s3.raw_telemetry_bucket_name
  iot_role_arn              = module.iam.iot_role_arn
}

module "acm" {
  source       = "./modules/acm"
  project_name = var.project_name
  domain_name  = var.domain_name
}

module "cloudfront" {
  source              = "./modules/cloudfront"
  project_name        = var.project_name
  acm_certificate_arn = module.acm.certificate_arn
}

module "route53" {
  source       = "./modules/route53"
  domain_name  = var.domain_name
  # In a production layout, these default values are overridden with the actual ALB DNS records
  # and ALB Route53 Hosted Zone ID created inside the Kubernetes ingress controller.
  # For static definition, we reference placeholders or variables.
}

module "cloudwatch" {
  source                  = "./modules/cloudwatch"
  project_name            = var.project_name
  environment             = var.environment
  aws_region              = var.aws_region
  alert_email             = var.alert_email
  rds_instance_identifier = "${var.project_name}-mysql"
  elasticache_cluster_id  = "${var.project_name}-redis"
  sqs_queue_name          = "${var.project_name}-sensor-queue"
  lambda_function_name    = "${var.project_name}-iot-processor"
}
