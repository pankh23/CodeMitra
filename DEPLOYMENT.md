# CodeMitra Deployment Guide 🚀

This guide covers various deployment options for CodeMitra, from local development to production environments.

## 📋 Table of Contents
##helloim pankh
- [Prerequisites](#prerequisites)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Cloud Deployment](#cloud-deployment)
- [Production Checklist](#production-checklist)
- [Monitoring & Logging](#monitoring--logging)
- [Troubleshooting](#troubleshooting)

## 🔧 Prerequisites

### System Requirements

- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### Software Requirements

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Node.js** 18+ (for local development)
- **PostgreSQL** 15+ (or Docker)
- **Redis** 7+ (or Docker)

## 🏠 Local Development

### Quick Start

```bash
# Clone repository
git clone https://github.com/yourusername/codemitra.git
cd codemitra

# Copy environment file
cp .env.example .env

# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up -d

# Access application
open http://localhost:3000
```

### Manual Setup

```bash
# Install dependencies
npm install

# Setup database
npm run prisma:generate
npm run prisma:migrate

# Start services
npm run dev
```

### Development Environment Variables

```env
# Development settings
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000

# Database
DATABASE_URL=postgresql://root:root@localhost:5432/codemitra
POSTGRES_DB=codemitra
POSTGRES_USER=root
POSTGRES_PASSWORD=root

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=dev-jwt-secret-key
JWT_EXPIRES_IN=7d

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-nextauth-secret

# Worker
WORKER_TIMEOUT=30000
WORKER_MEMORY_LIMIT=512m
```

## 🐳 Docker Deployment

### Production Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - codemitra_network
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - codemitra_network
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - codemitra_network
    restart: unless-stopped

  worker:
    build:
      context: ./worker
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - REDIS_URL=${REDIS_URL}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    depends_on:
      - redis
    networks:
      - codemitra_network
    restart: unless-stopped
    privileged: true

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - BACKEND_URL=${BACKEND_URL}
    depends_on:
      - backend
    networks:
      - codemitra_network
    restart: unless-stopped

  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - frontend
      - backend
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    networks:
      - codemitra_network
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:

networks:
  codemitra_network:
    driver: bridge
```

### Production Dockerfile Examples

#### Backend Dockerfile

```dockerfile
# backend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM node:18-alpine AS production

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 5000
CMD ["node", "dist/index.js"]
```

#### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile.prod
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine AS production

COPY --from=builder /app/.next /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Deployment Commands

```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Scale services
docker-compose -f docker-compose.prod.yml up -d --scale backend=3

# Update deployment
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

## ☸️ Kubernetes Deployment

### Namespace Setup

```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: codemitra
  labels:
    name: codemitra
    environment: production
```

### Database Deployment

```yaml
# k8s/postgres.yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
  namespace: codemitra
spec:
  serviceName: postgres
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "codemitra"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: codemitra
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
  type: ClusterIP
```

### Backend Deployment

```yaml
# k8s/backend.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: codemitra
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: your-registry/codemitra-backend:latest
        ports:
        - containerPort: 5000
        env:
        - name: NODE_ENV
          value: "production"
        - name: DATABASE_URL
          value: "postgresql://user:pass@postgres:5432/codemitra"
        - name: REDIS_URL
          value: "redis://redis:6379"
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: backend-secret
              key: jwt-secret
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: backend
  namespace: codemitra
spec:
  selector:
    app: backend
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: codemitra
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### Ingress Configuration

```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: codemitra-ingress
  namespace: codemitra
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - codemitra.com
    - api.codemitra.com
    secretName: codemitra-tls
  rules:
  - host: codemitra.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
  - host: api.codemitra.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: backend
            port:
              number: 5000
```

### Deployment Commands

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets
kubectl create secret generic postgres-secret \
  --from-literal=username=codemitra \
  --from-literal=password=secure-password \
  -n codemitra

kubectl create secret generic backend-secret \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=nextauth-secret=your-nextauth-secret \
  -n codemitra

# Deploy services
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/backend.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/worker.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n codemitra
kubectl get services -n codemitra
kubectl get ingress -n codemitra
```

## ☁️ Cloud Deployment

### AWS Deployment

#### EKS Setup

```bash
# Create EKS cluster
eksctl create cluster \
  --name codemitra-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 1 \
  --nodes-max 4 \
  --managed

# Deploy to EKS
kubectl apply -f k8s/
```

#### RDS Setup

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier codemitra-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username codemitra \
  --master-user-password secure-password \
  --allocated-storage 20
```

### Google Cloud Deployment

#### GKE Setup

```bash
# Create GKE cluster
gcloud container clusters create codemitra-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type e2-medium

# Deploy to GKE
kubectl apply -f k8s/
```

### Azure Deployment

#### AKS Setup

```bash
# Create AKS cluster
az aks create \
  --resource-group codemitra-rg \
  --name codemitra-cluster \
  --node-count 3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Deploy to AKS
kubectl apply -f k8s/
```

## ✅ Production Checklist

### Security

- [ ] **SSL/TLS certificates** configured
- [ ] **Environment variables** secured
- [ ] **Database passwords** strong and unique
- [ ] **JWT secrets** rotated regularly
- [ ] **Rate limiting** enabled
- [ ] **CORS** properly configured
- [ ] **Input validation** implemented
- [ ] **SQL injection** protection
- [ ] **XSS protection** enabled
- [ ] **CSRF protection** implemented

### Performance

- [ ] **CDN** configured for static assets
- [ ] **Database indexing** optimized
- [ ] **Redis caching** implemented
- [ ] **Load balancing** configured
- [ ] **Auto-scaling** enabled
- [ ] **Resource limits** set
- [ ] **Monitoring** configured
- [ ] **Logging** centralized

### Reliability

- [ ] **Database backups** automated
- [ ] **Health checks** implemented
- [ ] **Circuit breakers** configured
- [ ] **Retry mechanisms** implemented
- [ ] **Graceful shutdown** handled
- [ ] **Error handling** comprehensive
- [ ] **Logging** structured
- [ ] **Alerting** configured

### Monitoring

- [ ] **Application metrics** collected
- [ ] **Infrastructure metrics** monitored
- [ ] **Error tracking** implemented
- [ ] **Performance monitoring** active
- [ ] **Uptime monitoring** configured
- [ ] **Log aggregation** setup
- [ ] **Alerting rules** defined
- [ ] **Dashboard** created

## 📊 Monitoring & Logging

### Prometheus Configuration

```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'codemitra-backend'
    static_configs:
      - targets: ['backend:5000']
    metrics_path: '/metrics'

  - job_name: 'codemitra-worker'
    static_configs:
      - targets: ['worker:3001']
    metrics_path: '/metrics'
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "CodeMitra Metrics",
    "panels": [
      {
        "title": "Active Users",
        "type": "stat",
        "targets": [
          {
            "expr": "codemitra_active_users"
          }
        ]
      },
      {
        "title": "Code Executions",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(codemitra_code_executions_total[5m])"
          }
        ]
      }
    ]
  }
}
```

### Logging Configuration

```yaml
# logging/fluentd.conf
<source>
  @type tail
  path /var/log/containers/*.log
  pos_file /var/log/fluentd-containers.log.pos
  tag kubernetes.*
  read_from_head true
  <parse>
    @type json
    time_format %Y-%m-%dT%H:%M:%S.%NZ
  </parse>
</source>

<match kubernetes.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  logstash_format true
  logstash_prefix k8s
</match>
```

## 🔧 Troubleshooting

### Common Issues

#### Database Connection Issues

```bash
# Check database connectivity
kubectl exec -it deployment/backend -n codemitra -- nc -zv postgres 5432

# Check database logs
kubectl logs deployment/postgres -n codemitra

# Verify database credentials
kubectl get secret postgres-secret -n codemitra -o yaml
```

#### Redis Connection Issues

```bash
# Check Redis connectivity
kubectl exec -it deployment/backend -n codemitra -- nc -zv redis 6379

# Check Redis logs
kubectl logs deployment/redis -n codemitra

# Test Redis connection
kubectl exec -it deployment/backend -n codemitra -- redis-cli -h redis ping
```

#### Worker Issues

```bash
# Check worker logs
kubectl logs deployment/worker -n codemitra

# Check Docker socket access
kubectl exec -it deployment/worker -n codemitra -- ls -la /var/run/docker.sock

# Verify worker configuration
kubectl describe deployment/worker -n codemitra
```

#### Frontend Issues

```bash
# Check frontend logs
kubectl logs deployment/frontend -n codemitra

# Verify environment variables
kubectl exec -it deployment/frontend -n codemitra -- env | grep NEXTAUTH

# Check ingress configuration
kubectl describe ingress codemitra-ingress -n codemitra
```

### Performance Issues

#### High CPU Usage

```bash
# Check resource usage
kubectl top pods -n codemitra

# Scale up deployments
kubectl scale deployment backend --replicas=5 -n codemitra

# Check for memory leaks
kubectl exec -it deployment/backend -n codemitra -- node --inspect=0.0.0.0:9229
```

#### Database Performance

```bash
# Check slow queries
kubectl exec -it deployment/postgres -n codemitra -- psql -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Analyze table statistics
kubectl exec -it deployment/postgres -n codemitra -- psql -c "ANALYZE;"
```

### Security Issues

#### SSL Certificate Issues

```bash
# Check certificate status
kubectl describe certificate codemitra-tls -n codemitra

# Verify certificate
openssl s_client -connect codemitra.com:443 -servername codemitra.com

# Check cert-manager logs
kubectl logs deployment/cert-manager -n cert-manager
```

## 📚 Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)

---

For more detailed information, refer to the [main README](README.md) and [contributing guide](CONTRIBUTING.md). 