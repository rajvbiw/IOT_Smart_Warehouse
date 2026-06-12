resource "aws_sqs_queue" "dlq" {
  name = "${var.project_name}-dlq"
}

resource "aws_sqs_queue" "main" {
  name                       = "${var.project_name}-sensor-queue"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 86400 # 1 day

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 3
  })
}

resource "aws_sqs_queue_policy" "iot_send" {
  queue_url = aws_sqs_queue.main.id

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "sqs:SendMessage",
      "Resource": "${aws_sqs_queue.main.arn}"
    }
  ]
}
POLICY
}

variable "project_name" {}

output "queue_url" { value = aws_sqs_queue.main.url }
output "queue_arn" { value = aws_sqs_queue.main.arn }
