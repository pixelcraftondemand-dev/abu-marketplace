# Kubernetes Deployment Guide

This directory contains example Kubernetes manifests for running the Abu Marketplace app.

## Files

- `postgres.yaml`
  - Deploys a Postgres database as a Kubernetes Deployment and Service.
  - Includes a `PersistentVolumeClaim` so data is persisted between pod restarts.

- `secret.yaml`
  - Stores app environment variables, including `DATABASE_PROVIDER` and `DATABASE_URL`.
  - Replace these values with your real credentials before deploying to production.

- `deployment.yaml`
  - Deploys the Next.js application.
  - Uses `envFrom` to load secrets from `abu-marketplace-secrets`.
  - Includes both readiness and liveness probes.

- `service.yaml`
  - Exposes the app internally inside the cluster on port `3000`.

- `ingress.yaml`
  - Defines an ingress route for external access to `abu-marketplace.example.com`.
  - Assumes an NGINX ingress controller.

- `tls-secret.yaml`
  - Example TLS secret manifest for ingress.
  - Replace the certificate and key values with your actual TLS material.

## Deploying locally to Kubernetes

1. Apply the Postgres database manifest:

```bash
kubectl apply -f k8s/postgres.yaml
```

2. Apply the app secret manifest:

```bash
kubectl apply -f k8s/secret.yaml
```

3. Apply the app deployment and service:

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

4. If using TLS and ingress, create the TLS secret first:

```bash
kubectl apply -f k8s/tls-secret.yaml
kubectl apply -f k8s/ingress.yaml
```

## Verify the deployment

Check the status of pods:

```bash
kubectl get pods
```

Check services:

```bash
kubectl get svc
```

Check ingress:

```bash
kubectl get ingress
```

Inspect the Postgres pod and PVC:

```bash
kubectl describe pod -l app=abu-marketplace-postgres
kubectl get pvc
```

## Notes

- This is an example setup. For production use, a managed database and a proper secret store are recommended.
- If you use a cloud provider, replace `abu-marketplace.example.com` with your real domain.
- The ingress example expects an NGINX ingress controller; adapt it to your cluster's ingress provider if needed.
