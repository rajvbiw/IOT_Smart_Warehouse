resource "aws_iam_role" "pod_role" {
  name = "${var.project_name}-pod-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = var.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${replace(var.oidc_issuer, "https://", "")}:sub" = "system:serviceaccount:warehouse-system:warehouse-iot-sa"
          }
        }
      }
    ]
  })
}

resource "aws_iam_policy" "pod_policy" {
  name        = "${var.project_name}-pod-policy"
  description = "Allows pod services to access S3, SQS, SNS, IoT, and Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = [
          "arn:aws:s3:::${var.reports_bucket}/*",
          "arn:aws:s3:::${var.reports_bucket}"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "iot:Connect",
          "iot:Publish",
          "iot:Subscribe",
          "iot:Receive"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = "arn:aws:secretsmanager:*:*:secret:warehouse-iot/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "pod_attach" {
  policy_arn = aws_iam_policy.pod_policy.arn
  role       = aws_iam_role.pod_role.name
}

data "aws_caller_identity" "current" {}

data "tls_certificate" "github" {
  url = "https://token.actions.githubusercontent.com"
}

resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.github.certificates[0].sha1_fingerprint]
}

# GitHub Actions OIDC Role
resource "aws_iam_role" "github_actions" {
  name = "${var.project_name}-github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:${var.github_repository}:*"
          }
        }
      }
    ]
  })
}


resource "aws_iam_policy" "github_policy" {
  name = "${var.project_name}-github-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:BatchCheckLayerAvailability",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "eks:DescribeCluster",
          "eks:ListClusters"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "github_attach" {
  policy_arn = aws_iam_policy.github_policy.arn
  role       = aws_iam_role.github_actions.name
}

resource "aws_iam_role" "iot_role" {
  name = "${var.project_name}-iot-routing-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "iot.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_policy" "iot_policy" {
  name = "${var.project_name}-iot-routing-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.sqs_queue_arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::${var.raw_telemetry_bucket}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "iot_attach" {
  policy_arn = aws_iam_policy.iot_policy.arn
  role       = aws_iam_role.iot_role.name
}

variable "project_name" {}
variable "oidc_provider_arn" {}
variable "oidc_issuer" {}
variable "reports_bucket" {}
variable "raw_telemetry_bucket" {}
variable "sqs_queue_arn" {}
variable "github_repository" {}


output "pod_role_arn" { value = aws_iam_role.pod_role.arn }
output "github_role_arn" { value = aws_iam_role.github_actions.arn }
output "iot_role_arn" { value = aws_iam_role.iot_role.arn }
