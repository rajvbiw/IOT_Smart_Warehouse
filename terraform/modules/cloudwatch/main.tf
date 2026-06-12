resource "aws_sns_topic" "alerts" {
  name = "${var.project_name}-${var.environment}-cw-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "RDS instance CPU utilization is above 85% for two consecutive 5-minute periods"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_name          = "${var.project_name}-${var.environment}-rds-low-storage"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5000000000 # 5 GB in bytes
  alarm_description   = "RDS MySQL free storage space is below 5 GB"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = var.rds_instance_identifier
  }
}

resource "aws_cloudwatch_metric_alarm" "redis_cpu" {
  alarm_name          = "${var.project_name}-${var.environment}-redis-high-cpu"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "EngineCPUUtilization"
  namespace           = "AWS/ElastiCache"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "ElastiCache Redis Engine CPU utilization is above 80%"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    CacheClusterId = var.elasticache_cluster_id
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_backlog" {
  alarm_name          = "${var.project_name}-${var.environment}-sqs-sensor-backlog"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 60
  statistic           = "Average"
  threshold           = 1000
  alarm_description   = "SQS Queue depth exceeds 1000 messages for 3 minutes (indicates backend processing lag)"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    QueueName = var.sqs_queue_name
  }
}

resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${var.project_name}-${var.environment}-lambda-errors"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  alarm_description   = "Lambda IoT ingest function errors exceed 5 failed executions within 5 minutes"
  alarm_actions       = [aws_sns_topic.alerts.arn]
  ok_actions          = [aws_sns_topic.alerts.arn]

  dimensions = {
    FunctionName = var.lambda_function_name
  }
}

resource "aws_cloudwatch_dashboard" "ops_dashboard" {
  dashboard_name = "${var.project_name}-${var.environment}-ops-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", var.rds_instance_identifier]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS Database CPU Utilization (%)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ElastiCache", "EngineCPUUtilization", "CacheClusterId", var.elasticache_cluster_id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "Redis Engine CPU Utilization (%)"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", var.sqs_queue_name]
          ]
          period = 60
          stat   = "Average"
          region = var.aws_region
          title  = "SQS Sensor Queue Backlog (Messages Visible)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/Lambda", "Invocations", "FunctionName", var.lambda_function_name],
            ["AWS/Lambda", "Errors", "FunctionName", var.lambda_function_name, { stat = "Sum", color = "#d62728" }]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "Lambda IoT Processor Invocations & Errors"
        }
      }
    ]
  })
}

variable "project_name" {
  type        = string
  description = "Project name prefix"
}

variable "environment" {
  type        = string
  description = "Deployment environment"
}

variable "aws_region" {
  type        = string
  description = "Target region for operations"
}

variable "alert_email" {
  type        = string
  description = "Destination email for operations alerts"
}

variable "rds_instance_identifier" {
  type        = string
  description = "RDS DB Instance identifier for monitoring"
}

variable "elasticache_cluster_id" {
  type        = string
  description = "Redis Cache Cluster identifier for monitoring"
}

variable "sqs_queue_name" {
  type        = string
  description = "SQS Queue Name for backlog monitoring"
}

variable "lambda_function_name" {
  type        = string
  description = "Lambda Function Name for error monitoring"
}

output "sns_topic_arn" {
  value       = aws_sns_topic.alerts.arn
  description = "ARN of the SNS topic for CloudWatch alerts"
}
