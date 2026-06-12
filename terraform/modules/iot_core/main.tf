resource "aws_iot_policy" "device" {
  name = "${var.project_name}-device-policy"

  policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "iot:Connect",
        "iot:Publish",
        "iot:Subscribe",
        "iot:Receive"
      ],
      "Resource": [
        "arn:aws:iot:*:*:topic/warehouse/*",
        "arn:aws:iot:*:*:client/warehouse-device-*"
      ]
    }
  ]
}
EOF
}

resource "aws_iot_thing" "devices" {
  count = var.device_count
  name  = "warehouse-device-${count.index + 1}"
}

# Auto-created certificates inside simulator or terraform
resource "aws_iot_certificate" "certs" {
  count  = var.device_count
  active = true
}

resource "aws_iot_thing_principal_attachment" "attachments" {
  count     = var.device_count
  thing     = aws_iot_thing.devices[count.index].name
  principal = aws_iot_certificate.certs[count.index].arn
}

resource "aws_iot_policy_attachment" "policy_attachments" {
  count     = var.device_count
  policy    = aws_iot_policy.device.name
  principal = aws_iot_certificate.certs[count.index].arn
}

resource "aws_iot_topic_rule" "rule" {
  name        = "warehouse_sensor_rule"
  description = "Routes MQTT telemetry from IoT Core to Lambda, SQS, and S3"
  enabled     = true
  sql         = "SELECT * FROM 'warehouse/+/device/+/telemetry'"
  sql_version = "2016-03-23"

  lambda {
    function_arn = var.lambda_arn
  }

  sqs {
    queue_url  = var.sqs_queue_url
    role_arn   = var.iot_role_arn
    use_base64 = false
  }

  s3 {
    bucket_name = var.raw_telemetry_bucket_name
    key         = "telemetry/\${topic()}/\${timestamp()}.json"
    role_arn    = var.iot_role_arn
  }
}

data "aws_iot_endpoint" "endpoint" {
  endpoint_type = "iot:Data-ATS"
}

variable "project_name" {}
variable "device_count" { default = 24 }
variable "lambda_arn" {}
variable "sqs_queue_url" {}
variable "raw_telemetry_bucket_name" {}
variable "iot_role_arn" {}

output "iot_endpoint" { value = data.aws_iot_endpoint.endpoint.endpoint_address }
