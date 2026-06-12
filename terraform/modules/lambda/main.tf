data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/src/index.js"
  output_path = "${path.module}/src/lambda.zip"
}

resource "aws_iam_role" "lambda" {
  name = "${var.project_name}-lambda-iot-role"

  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
}

resource "aws_iam_policy" "lambda_sqs" {
  name = "${var.project_name}-lambda-sqs-policy"

  policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": "${var.sqs_queue_arn}"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda.name
}

resource "aws_iam_role_policy_attachment" "lambda_sqs_attachment" {
  policy_arn = aws_iam_policy.lambda_sqs.arn
  role       = aws_iam_role.lambda.name
}

resource "aws_lambda_function" "iot_processor" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_name}-iot-processor"
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  timeout          = 30
  memory_size      = 128

  environment {
    variables = {
      SQS_QUEUE_URL = var.sqs_queue_url
      REGION        = var.aws_region
    }
  }
}

resource "aws_lambda_permission" "allow_iot" {
  statement_id  = "AllowExecutionFromIoT"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.iot_processor.function_name
  principal     = "iot.amazonaws.com"
}

variable "project_name" {}
variable "aws_region" {}
variable "sqs_queue_url" {}
variable "sqs_queue_arn" {}

output "lambda_arn" { value = aws_lambda_function.iot_processor.arn }
