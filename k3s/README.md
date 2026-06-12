# K3s Edge Deployment Guide

This directory contains manifests to deploy the lightweight Edge node on-premises (e.g. Raspberry Pi or local x86 microcomputers).

## 1. Install K3s on Edge Node
Run the following script on your local on-premise device to install K3s:
```bash
curl -sfL https://get.k3s.io | sh -
```

## 2. Configure kubectl
Retrieve the kubeconfig file from the node:
```bash
sudo cat /etc/rancher/k3s/k3s.yaml
# Copy this file to your management machine and update the host server IP.
```

## 3. Label Node as Edge
Label the target node to deploy edge-specific workloads:
```bash
kubectl label nodes <your-edge-node-name> kubernetes.io/hostname=edge-node-01
```

## 4. Deploy Manifests
Deploy the edge processing stack:
```bash
kubectl apply -f local-influxdb.yaml
kubectl apply -f local-mosquitto.yaml
kubectl apply -f local-grafana.yaml
kubectl apply -f local-prometheus.yaml
kubectl apply -f local-grafana-prometheus-datasource.yaml
kubectl apply -f edge-processor-deployment.yaml
kubectl apply -f cloud-sync-cronjob.yaml
```

## 5. Network Flow
Sensors publish local telemetry to `local-mosquitto` (port 1883). The `edge-processor` consumes the telemetry, updates the `local-influxdb` instance, and registers Prometheus metrics, working fully offline. The `cloud-sync` CronJob runs every 5 minutes to sweep metrics and sync back to AWS IoT Core when internet connectivity is active.
