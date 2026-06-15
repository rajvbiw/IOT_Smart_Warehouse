resource "aws_secretsmanager_secret" "db_password" {
  name = "warehouse-iot/db-password"
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = "CHANGE_ME"
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "warehouse-iot/jwt-secret"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = "CHANGE_ME_MIN_32_CHARS"
}

resource "aws_secretsmanager_secret" "influx_token" {
  name = "warehouse-iot/influx-token"
}

resource "aws_secretsmanager_secret_version" "influx_token" {
  secret_id     = aws_secretsmanager_secret.influx_token.id
  secret_string = "CHANGE_ME"
}

resource "aws_secretsmanager_secret" "redis_password" {
  name = "warehouse-iot/redis-password"
}

resource "aws_secretsmanager_secret_version" "redis_password" {
  secret_id     = aws_secretsmanager_secret.redis_password.id
  secret_string = "CHANGE_ME"
}

output "db_password_arn" { value = aws_secretsmanager_secret.db_password.arn }
output "jwt_secret_arn" { value = aws_secretsmanager_secret.jwt_secret.arn }
output "influx_token_arn" { value = aws_secretsmanager_secret.influx_token.arn }
output "redis_password_arn" { value = aws_secretsmanager_secret.redis_password.arn }
