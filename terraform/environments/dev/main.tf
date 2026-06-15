terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "warehouse-iot-tf-state-dev"
    key            = "dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "warehouse-iot-tf-locks-dev"
    encrypt        = true
  }
}

provider "aws" {
  region = "ap-south-1"
}

module "root" {
  source = "../../"

  aws_region             = "ap-south-1"
  environment            = "dev"
  project_name           = "warehouse-iot-dev"
  eks_node_instance_type = "t3.medium"
  eks_desired_nodes      = 2
  eks_min_nodes          = 1
  eks_max_nodes          = 3
  rds_instance_class     = "db.t3.micro"
  domain_name            = "dev.warehouse.example.com"
  alert_email            = "dev-alerts@warehouse.example.com"
  iot_device_count       = 5
}
