variable "aws_region" {
  description = "Target AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Target environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project prefix for resource names"
  type        = string
  default     = "warehouse-iot"
}

variable "eks_node_instance_type" {
  description = "EC2 instance size for node group"
  type        = string
  default     = "t3.medium"
}

variable "eks_desired_nodes" {
  type    = number
  default = 2
}

variable "eks_min_nodes" {
  type    = number
  default = 2
}

variable "eks_max_nodes" {
  type    = number
  default = 5
}

variable "rds_instance_class" {
  description = "DB Instance size"
  type        = string
  default     = "db.t3.micro"
}

variable "domain_name" {
  description = "Root domain for the ingress ALB"
  type        = string
  default     = "warehouse.example.com"
}

variable "alert_email" {
  description = "Mailing address for critical SQS/RDS alerts"
  type        = string
  default     = "ops-alerts@warehouse.example.com"
}

variable "iot_device_count" {
  description = "Number of AWS IoT Things to provision"
  type        = number
  default     = 24
}
