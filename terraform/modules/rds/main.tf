resource "aws_db_subnet_group" "rds" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = var.private_subnets
  tags = {
    Name = "${var.project_name}-rds-subnet-group"
  }
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds-sg"
  description = "Access control for RDS MySQL database"
  vpc_id      = var.vpc_id

  ingress {
    from_port   = 3306
    to_port     = 3306
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/16"] # access from VPC
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "mysql" {
  identifier                  = "${var.project_name}-mysql"
  allocated_storage           = 20
  max_allocated_storage       = 100
  storage_type                = "gp3"
  engine                      = "mysql"
  engine_version              = "8.0"
  instance_class              = var.instance_class
  db_name                     = "warehouse_iot"
  username                    = "root"
  password                    = "password" # placeholder, changed in prod
  parameter_group_name        = "default.mysql8.0"
  db_subnet_group_name        = aws_db_subnet_group.rds.name
  vpc_security_group_ids      = [aws_security_group.rds.id]
  publicly_accessible         = false
  skip_final_snapshot         = true
  storage_encrypted           = true
  multi_az                    = false
  backup_retention_period     = 7
  deletion_protection         = false # false for easy test, true in dev-override

  performance_insights_enabled = true
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]

  tags = {
    Name = "${var.project_name}-rds"
  }
}

variable "project_name" {}
variable "vpc_id" {}
variable "private_subnets" {}
variable "instance_class" {}

output "rds_endpoint" { value = aws_db_instance.mysql.address }
output "rds_port" { value = aws_db_instance.mysql.port }
