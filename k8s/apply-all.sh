#!/bin/bash
set -e

kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/tls-secret.yaml
kubectl apply -f k8s/ingress.yaml

kubectl rollout status deployment/abu-marketplace
kubectl rollout status deployment/abu-marketplace-postgres

kubectl get pods,svc,ingress
