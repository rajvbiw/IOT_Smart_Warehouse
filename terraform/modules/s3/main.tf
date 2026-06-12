resource "aws_s3_bucket" "reports" {
  bucket = "${var.project_name}-reports"
}

resource "aws_s3_bucket_lifecycle_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    id     = "archive"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "reports" {
  bucket = aws_s3_bucket.reports.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "reports" {
  bucket                  = aws_s3_bucket.reports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Raw Telemetry Bucket (high volume, 30 days retention)
resource "aws_s3_bucket" "raw_telemetry" {
  bucket = "${var.project_name}-raw-telemetry"
}

resource "aws_s3_bucket_lifecycle_configuration" "raw_telemetry" {
  bucket = aws_s3_bucket.raw_telemetry.id

  rule {
    id     = "retention"
    status = "Enabled"
    expiration {
      days = 30
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "raw_telemetry" {
  bucket = aws_s3_bucket.raw_telemetry.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "raw_telemetry" {
  bucket                  = aws_s3_bucket.raw_telemetry.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# State locking DynamoDB
resource "aws_dynamodb_table" "lock" {
  name         = "${var.project_name}-tflock"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }
}

variable "project_name" {}

output "reports_bucket_name" { value = aws_s3_bucket.reports.id }
output "raw_telemetry_bucket_name" { value = aws_s3_bucket.raw_telemetry.id }
output "dynamodb_table_name" { value = aws_dynamodb_table.lock.name }
