
#!/usr/bin/env bash
set -euo pipefail
ENV="${1:-dev}"
[[ "$ENV" =~ ^(dev|prod)$ ]] || { echo "Usage: $0 [dev|prod]"; exit 1; }
GREEN='\033[0;32m'; BLUE='\033[0;34m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC}   $*"; }
fail() { echo -e "${RED}[FAIL]${NC} $*"; exit 1; }
log "Checking prerequisites..."
for cmd in docker kubectl kustomize; do
  command -v "$cmd" &>/dev/null || fail "Missing: $cmd"
done
kubectl cluster-info &>/dev/null || fail "Cannot reach Kubernetes cluster"
ok "Prerequisites OK"
log "Building Docker images..."
docker build -t backend-api:latest  ./app/backend  && ok "Built backend-api"
docker build -t frontend:latest     ./app/frontend && ok "Built frontend"
if command -v k3s &>/dev/null; then
  log "Importing images into k3s..."
  docker save backend-api:latest | sudo k3s ctr images import -
  docker save frontend:latest    | sudo k3s ctr images import -
  ok "Images imported"
fi
log "Deploying overlay: $ENV"
kubectl apply -k "k8s/overlays/$ENV"
ok "Manifests applied"
log "Waiting for rollout..."
kubectl rollout status deployment/backend-api -n microservices --timeout=120s
kubectl rollout status deployment/frontend    -n microservices --timeout=120s
EC2_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "YOUR-EC2-IP")
echo ""
ok "========================================"
ok " Done! Open: http://${EC2_IP}:30080"
ok "========================================"
