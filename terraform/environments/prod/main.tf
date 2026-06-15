terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "warehouse-iot-tf-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    dynamodb_table = "warehouse-iot-tf-locks-prod"
    encrypt        = true
  }
}

provider "aws" {
  region = "us-west-2"
}

module "root" {
  source = "../../"

  aws_region             = "us-west-2"
  environment            = "prod"
  project_name           = "warehouse-iot-prod"
  eks_node_instance_type = "t3.micro"
  eks_desired_nodes      = 4
  eks_min_nodes          = 3
  eks_max_nodes          = 6
  rds_instance_class     = "db.t3.micro"
  domain_name            = "warehouse.example.com"
  alert_email            = "prod-alerts@warehouse.example.com"
  iot_device_count       = 24
}
