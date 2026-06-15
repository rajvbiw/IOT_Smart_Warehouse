import {
  to = module.root.module.ecr.aws_ecr_repository.backend
  id = "warehouse-iot-prod-backend"
}

import {
  to = module.root.module.ecr.aws_ecr_repository.frontend
  id = "warehouse-iot-prod-frontend"
}

import {
  to = module.root.module.eks.aws_eks_node_group.this
  id = "warehouse-iot-prod-cluster:warehouse-iot-prod-nodes"
}

import {
  to = module.root.module.eks.aws_eks_addon.cni
  id = "warehouse-iot-prod-cluster:vpc-cni"
}

import {
  to = module.root.module.eks.aws_eks_addon.proxy
  id = "warehouse-iot-prod-cluster:kube-proxy"
}


import {
  to = module.root.module.eks.aws_iam_openid_connect_provider.this
  id = "arn:aws:iam::446483465469:oidc-provider/oidc.eks.ap-south-1.amazonaws.com/id/3E46B66AAC56B2390E2CB99F45209B6E"
}

import {
  to = module.root.module.elasticache.aws_elasticache_subnet_group.redis
  id = "warehouse-iot-prod-redis-subnet-group"
}

import {
  to = module.root.module.iot_core.aws_iot_policy.device
  id = "warehouse-iot-prod-device-policy"
}

import {
  to = module.root.module.rds.aws_db_subnet_group.rds
  id = "warehouse-iot-prod-db-subnet-group"
}

import {
  to = module.root.module.s3.aws_dynamodb_table.lock
  id = "warehouse-iot-prod-tflock"
}

import {
  to = module.root.module.secrets_manager.aws_secretsmanager_secret.db_password
  id = "warehouse-iot/db-password"
}

import {
  to = module.root.module.secrets_manager.aws_secretsmanager_secret.jwt_secret
  id = "warehouse-iot/jwt-secret"
}

import {
  to = module.root.module.secrets_manager.aws_secretsmanager_secret.influx_token
  id = "warehouse-iot/influx-token"
}

import {
  to = module.root.module.secrets_manager.aws_secretsmanager_secret.redis_password
  id = "warehouse-iot/redis-password"
}
