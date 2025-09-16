import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { mockServices } from '@backstage/backend-test-utils';

// Mock the Kubernetes client
const mockListDeploymentForAllNamespaces = jest.fn();
const mockMakeApiClient = jest.fn();
const mockLoadFromDefault = jest.fn();

jest.mock('@kubernetes/client-node', () => ({
  KubeConfig: jest.fn().mockImplementation(() => ({
    loadFromDefault: mockLoadFromDefault,
    makeApiClient: mockMakeApiClient,
  })),
  AppsV1Api: jest.fn().mockImplementation(() => ({
    listDeploymentForAllNamespaces: mockListDeploymentForAllNamespaces,
  })),
}));

describe('createRouter', () => {
  let app: express.Express;
  let mockLogger: any;

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock logger
    mockLogger = mockServices.logger.mock();

    // Setup default mock implementations
    mockLoadFromDefault.mockImplementation(() => {});
    mockMakeApiClient.mockReturnValue({
      listDeploymentForAllNamespaces: mockListDeploymentForAllNamespaces,
    });

    // Create router and app
    const router = await createRouter({
      logger: mockLogger,
    });

    app = express().use(router);
  });

  describe('GET /healthz', () => {
    it('should return healthy status - happy path', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok'
      });
    });

    it('should handle different HTTP methods - error path', async () => {
      await request(app)
        .post('/healthz')
        .expect(404);

      await request(app)
        .put('/healthz')
        .expect(404);

      await request(app)
        .delete('/healthz')
        .expect(404);
    });
  });

  describe('GET /v1/summary', () => {
    it('should return deployment summary successfully - happy path', async () => {
      // Mock successful Kubernetes API response
      const mockDeployments = {
        items: [
          {
            metadata: {
              name: 'backstage',
              namespace: 'backstage'
            },
            spec: {
              replicas: 1
            },
            status: {
              availableReplicas: 1
            }
          },
          {
            metadata: {
              name: 'coredns',
              namespace: 'kube-system'
            },
            spec: {
              replicas: 2
            },
            status: {
              availableReplicas: 2
            }
          },
          {
            metadata: {
              name: 'degraded-app',
              namespace: 'default'
            },
            spec: {
              replicas: 3
            },
            status: {
              availableReplicas: 1
            }
          }
        ]
      };

      mockListDeploymentForAllNamespaces.mockResolvedValue(mockDeployments as any);

      const response = await request(app)
        .get('/v1/summary')
        .expect(200);

      expect(response.body).toEqual({
        backstage: [
          {
            name: 'backstage',
            replicas: 1,
            availableReplicas: 1,
            status: 'healthy'
          }
        ],
        'kube-system': [
          {
            name: 'coredns',
            replicas: 2,
            availableReplicas: 2,
            status: 'healthy'
          }
        ],
        default: [
          {
            name: 'degraded-app',
            replicas: 3,
            availableReplicas: 1,
            status: 'degraded'
          }
        ]
      });

      // Verify Kubernetes client was called correctly
      expect(mockLoadFromDefault).toHaveBeenCalledTimes(1);
      expect(mockMakeApiClient).toHaveBeenCalledTimes(1);
      expect(mockListDeploymentForAllNamespaces).toHaveBeenCalledTimes(1);
    });

    it('should only accept GET for /v1/summary - error path', async () => {
      await request(app)
        .post('/v1/summary')
        .expect(404);

      await request(app)
        .put('/v1/summary')
        .expect(404);

      await request(app)
        .delete('/v1/summary')
        .expect(404);

      await request(app)
        .patch('/v1/summary')
        .expect(404);
    });

    it('should return empty object when no deployments exist - happy path edge case', async () => {
      // Mock empty deployments response
      const mockDeployments = {
        items: []
      };

      mockListDeploymentForAllNamespaces.mockResolvedValue(mockDeployments as any);

      const response = await request(app)
        .get('/v1/summary')
        .expect(200);

      expect(response.body).toEqual({});
    });

    it('should handle Kubernetes API errors - error path', async () => {
      // Mock Kubernetes API error
      const kubernetesError = new Error('Failed to connect to Kubernetes cluster');
      mockListDeploymentForAllNamespaces.mockRejectedValue(kubernetesError);

      const response = await request(app)
        .get('/v1/summary')
        .expect(500);

      expect(response.body).toEqual({
        error: 'Failed to fetch deployments'
      });

      // Verify error was logged
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch deployments',
        kubernetesError
      );
    });

    it('should return 404 for unknown routes - error path', async () => {
      await request(app)
        .get('/unknown-endpoint')
        .expect(404);
    });
  });
});