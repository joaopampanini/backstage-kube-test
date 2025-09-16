## Prerequisites
- **Docker**
- **Minikube**
- **kubectl**
- **Node.js** (version 20 or higher)
- **Yarn**
- **Git**

## Cluster Creation Steps

Basically run this commands

```
 minikube start
 kubectl get pods -A
```

All other steps are in the `k8s` folder that will be used on deploy step.

## Image Build & Deploy Steps

```bash
cd backstage
yarn install
yarn tsc
yarn build:all
eval $(minikube docker-env)
yarn build-image --tag jmpf-backstage-local
```

With the image built, you can deploy it to the cluster running.

```bash
kubectl apply -k k8s/
```

## How to Test with curl

```bash
kubectl port-forward svc/backstage 7007:7007
```

Now you can access Backstage at: `http://localhost:7007`


---

#### Health Check
```bash
curl -X GET http://localhost:7007/api/platform-insights/healthz
```

**Expected Response:**
```json
{
  "status": "ok"
}
```

#### Get Summary
```bash
curl -X GET http://localhost:7007/api/platform-insights/v1/summary
```

**Expected Response:**
```json
{
  ...
  "default": [
    {
      "name": "backstage",
      "replicas": 1,
      "availableReplicas": 1,
      "status": "healthy"
    }
  ],
  ...
}
```
---
Alternatively you can test the API through the UI at: `http://localhost:7007/catalog/default/api/platform-insights-api/definition`

## Next Steps

- Add a UI where I can see in real time the health of the platform.