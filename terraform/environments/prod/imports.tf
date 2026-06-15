import {
  to = module.root.module.ecr.aws_ecr_repository.backend
  id = "warehouse-iot-prod-backend"
}

import {
  to = module.root.module.ecr.aws_ecr_repository.frontend
  id = "warehouse-iot-prod-frontend"
}

import {
  to = module.root.module.iot_core.aws_iot_policy.device
  id = "warehouse-iot-prod-device-policy"
}

import {
  to = module.root.module.eks.aws_iam_role.ebs_csi
  id = "warehouse-iot-prod-ebs-csi-role"
}

import {
  to = module.root.module.iam.aws_iam_role.pod_role
  id = "warehouse-iot-prod-pod-role"
}
