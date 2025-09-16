import { KubeConfig, AppsV1Api } from '@kubernetes/client-node';
import { LoggerService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';

type SummaryResponse = Record<string, Array<{
  name: string;
  replicas: number;
  availableReplicas: number;
  status: 'healthy' | 'degraded';
}>>;

export async function createRouter({
 logger,
}: {
  logger: LoggerService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

    router.get("/v1/summary", async (_, res) => {
      try {
        const kc = new KubeConfig();
        kc.loadFromDefault();

        const k8sApi = kc.makeApiClient(AppsV1Api);
        const deploymentsResponse = await k8sApi.listDeploymentForAllNamespaces();

        const summary = deploymentsResponse.items.reduce((acc, deployment) => {
          const namespace = deployment.metadata?.namespace || 'default';
          const name = deployment.metadata?.name || 'unknown';
          const replicas = deployment.spec?.replicas || 0;
          const availableReplicas = deployment.status?.availableReplicas || 0;
          const status = availableReplicas === replicas ? 'healthy' : 'degraded';

          if (!acc[namespace]) {
            acc[namespace] = [];
          }

          acc[namespace].push({
            name,
            replicas,
            availableReplicas,
            status
          });

          return acc;
        }, {} as SummaryResponse);

        res.json(summary);
      } catch (error: any) {
        logger.error('Failed to fetch deployments', error);
        res.status(500).json({ error: 'Failed to fetch deployments' });
      }
    });

  router.get("/healthz", (_, res) => {
    res.status(200).json({ status: "ok" });
  });

  return router;
}
