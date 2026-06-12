# IoT Smart Warehouse Management System

A high-performance, production-ready, real-time IoT monitoring and inventory management system designed for warehouses, cold storage facilities, and pharmaceutical companies. The system supports live telemetry tracking (temperature, humidity, stock, motion, door, and fire sensors), spatial floor maps, sliding-window threshold alerting, automated reporting with S3 storage, and offline edge failover capabilities.

---

## System Architecture

```
                                  +---------------------------------------+
                                  |         REACT SINGLE PAGE APP         |
                                  |         (CloudFront / Nginx)          |
                                  +---+-------------------------------+---+
                                      |                               ^
                             HTTP API | (JWT)               WebSockets| (Socket.io)
                                      v                               |
                                  +---+-------------------------------+---+
                                  |            EXPRESS BACKEND            |
                                  |              (EKS / Node)             |
                                  +---+------+-----+-----+-----+------+---+
                                      |      |     |     |     |      |
        +-----------------------------+      |     |     |     |      +------------------------------+
        |                                    |     |     |     |                                     |
        v                                    v     |     v     v                                     v
+-------+--------+                     +-----+--+  |  +--+-----+--+                              +---+----+
|  REDIS CACHE   |                     | INFLUX |  |  |  AWS SNS  |                              | AWS S3 |
| (ElastiCache)  |                     |  DB    |  |  |  (Alerts) |                              |Reports |
+----------------+                     +--------+  |  +-----------+                              +--------+
                                                   |
                                                   v
                                            +------+-------+
                                            |  MYSQL 8 DB  |
                                            |    (RDS)     |
                                            +------+-------+
                                                   ^
                                                   | Sync anomalies
                                                   | (Cron sync script)
+--------------------------------------------------+------------------------------------------------------+
| EDGE MONITORING (K3s / On-Premises)                                                                     |
|                                                                                                         |
|  +-------------------+        +-------------------+        +-------------------+       +-------------+  |
|  |   EDGE SENSORS    +=======>+ MOSQUITTO BROKER  +=======>+  EDGE PROCESSOR   +======>+ LOCAL INFLUX|  |
|  | (Modbus/MQTT/etc) | (MQTT) |  (MQTT Bridge)    | (MQTT) | (Node Sync Agent) |(Write)|   DATABASE  |  |
|  +-------------------+        +--------+----------+        +---------+---------+       +-------------+  |
|                                        |                             |                                  |
|                                        | Secure SSL Tunnel           | Scrapes metrics                  |
|                                        v                             v                                  |
|                               +--------+----------+        +---------+---------+                        |
|                               |   AWS IOT CORE    |        | LOCAL PROMETHEUS  +=======> LOCAL GRAFANA  |
|                               +--------+----------+        +-------------------+ (View)                 |
|                                        |                                                                |
|                                        v IoT Rule                                                       |
|                               +--------+----------+                                                     |
|                               |    AWS LAMBDA     +=======> SQS QUEUE                                   |
|                               +-------------------+ (Push)                                              |
+---------------------------------------------------------------------------------------------------------+
```

---

## Core Technology Stack

*   **Frontend**: React 18, TypeScript, Tailwind CSS, TanStack Query v5, React Router v6, Recharts (gauges, line & bar timelines), React Leaflet (spatial zones & markers overlays), Socket.io-client.
*   **Backend**: Node.js, Express, Sequelize ORM (MySQL 8), InfluxDB client (timeseries), Redis (latest telemetry caching), AWS SDK v3 (S3, SNS, SQS), MQTT client.
*   **DevOps & Deployment**: Docker, Docker Compose, Kubernetes (EKS), Helm v3, ArgoCD, K3s (Edge), Terraform (VPC, EKS, RDS, ElastiCache, Lambda, IoT Core, IAM, CloudWatch).

---

## Environment Configuration

Create a `.env` file in the `backend/` directory. You can use the provided template:

```bash
cp backend/.env.example backend/.env
```

Key environment parameters:
*   `PORT`: Backend server listener port (default: `5000`).
*   `DB_HOST`, `DB_USER`, `DB_PASSWORD`: Connections for the MySQL database.
*   `INFLUX_URL`, `INFLUX_TOKEN`: Connections for InfluxDB v2 timeseries.
*   `REDIS_HOST`, `REDIS_PORT`: Connections for the Redis telemetry cache.
*   `MQTT_BROKER_URL`: Local Mosquitto Broker address (default: `mqtt://localhost:1883`).
*   `SIMULATE_DEVICES`: When `true`, enables the background simulator script that publishes random telemetry for all 24 sensors.

---

## Seeded User Accounts & Roles

The system seeds several test users with varying Role-Based Access Control (RBAC) levels:

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@warehouse-iot.com` | `admin123` | System-wide configuration and all warehouses |
| **Warehouse Manager** | `mumbai.mgr@warehouse-iot.com` | `manager123` | Mumbai Warehouse (ID: 1) CRUD operations |
| **Warehouse Manager** | `pune.mgr@warehouse-iot.com` | `manager123` | Pune Cold Storage (ID: 2) CRUD operations |
| **Operator** | `mumbai.op1@warehouse-iot.com` | `operator123` | Read-only telemetry, add asset movement logs |

---

## Simulated IoT Devices (24 Total)

The local simulator automatically generates and streams data for the following setup:

### Warehouse 1: Mumbai General Cargo (Zones 1-4)
*   `mum-temp-01` / `mum-hum-01` / `mum-stock-01` (Dry Storage Area A)
*   `mum-temp-02` / `mum-hum-02` / `mum-stock-02` (Dry Storage Area B)
*   `mum-mot-01` / `mum-door-01` / `mum-fire-01` (Loading Bay West)
*   `mum-temp-haz` / `mum-hum-haz` / `mum-fire-haz` (Hazmat Cell)

### Warehouse 2: Pune Cold Storage (Zones 5-8)
*   `pun-temp-01` / `pun-hum-01` / `pun-door-01` (Cold Storage Room 1)
*   `pun-temp-02` / `pun-hum-02` / `pun-stock-02` (Cold Storage Room 2)
*   `pun-mot-01` / `pun-door-dock` / `pun-fire-dock` (Loading Bay East)
*   `pun-temp-vac` / `pun-hum-vac` / `pun-door-vac` (Pharma Vaccine Cell)

---

## Local Development Quickstart

### Prerequisites
*   Node.js v18+ & NPM
*   Docker & Docker Compose

### 1. Launch Infrastructures (Docker Compose)
Start MySQL, InfluxDB, Redis, Mosquitto, and Grafana:
```bash
docker-compose up -d
```

### 2. Configure and Boot the Backend Server
Install dependencies, run the database seeders, and start the development server:
```bash
cd backend
npm install

# Build TypeScript
npm run build

# Seed relational schemas & InfluxDB time-series mock data
npm run seed:mysql
npm run seed:influx

# Start backend REST, WebSocket & MQTT simulator server
npm run dev
```

### 3. Boot the React Frontend
Open a new terminal window:
```bash
cd frontend
npm install
npm run dev
```
Navigate to `http://localhost:3000` to access the application.

---

## Cloud Deployment (AWS)

The infrastructure is defined as reusable Terraform modules under `/terraform`.

### 1. Provision Infrastructure via Terraform
Configure the variables in `terraform/environments/prod/main.tf` and initialize:
```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply
```

### 2. Deploy Manifests with Helm & ArgoCD
Initialize Helm values override and register the EKS cluster to ArgoCD:
```bash
# Update local kubeconfig to EKS
aws eks update-kubeconfig --name warehouse-iot-prod-cluster --region us-west-2

# Deploy ArgoCD master App of Apps
kubectl apply -f argocd/app-of-apps.yaml
```
ArgoCD will automatically pull dependencies and configure the InfluxDB StatefulSet, Redis, Mosquitto, API service, and Frontend configurations.

---

## Edge Offline Setup (K3s)

For environments with unstable WAN connectivity, the edge processor retains measurements locally.

### 1. Setup Local Edge Node
Install K3s lightweight Kubernetes engine on local gateway machine:
```bash
curl -sfL https://get.k3s.io | sh -
```

### 2. Deploy Edge Stack
Apply the manifests located in the `k3s/` folder:
```bash
kubectl apply -f k3s/local-influxdb.yaml
kubectl apply -f k3s/local-mosquitto.yaml
kubectl apply -f k3s/local-prometheus.yaml
kubectl apply -f k3s/edge-processor-deployment.yaml
```

The edge processor will subscribe to local sensor streams via the local Mosquitto broker. When WAN connection is alive, the `cloud-sync-cronjob` pushes backlogged anomalies to AWS IoT Core.
