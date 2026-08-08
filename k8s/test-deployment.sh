#!/bin/bash
set -e

# Wait for the app deployment to be ready
kubectl rollout status deployment/abu-marketplace

# Wait for the Postgres deployment to be ready
kubectl rollout status deployment/abu-marketplace-postgres

# Check that all pods are running
kubectl get pods

# Check that service exists
kubectl get svc abu-marketplace
kubectl get svc abu-marketplace-postgres

# Check ingress exists
kubectl get ingress abu-marketplace-ingress

# Test app endpoint from within the cluster using a temporary pod
kubectl run -it --rm curl-test --image=curlimages/curl --restart=Never -- sh -c 'sleep 2; curl -f http://abu-marketplace:3000 || exit 1'

echo "Kubernetes deployment test completed successfully."
