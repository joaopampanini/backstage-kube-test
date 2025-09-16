import { startTestBackend } from '@backstage/backend-test-utils';
import { platformInsightsPlugin } from './plugin';
import request from 'supertest';

// Mock the Kubernetes client for integration tests
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

describe('platform-insights plugin integration tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockLoadFromDefault.mockImplementation(() => {});
    mockMakeApiClient.mockReturnValue({
      listDeploymentForAllNamespaces: mockListDeploymentForAllNamespaces,
    });
  });

  it('should respond to health check endpoint', async () => {
    const { server } = await startTestBackend({
      features: [platformInsightsPlugin],
    });

    await request(server)
      .get('/api/platform-insights/healthz')
      .expect(200, {
        status: 'ok',
      });
  });

  it('should handle deployment summary endpoint with mocked data', async () => {
    // Mock successful Kubernetes API response
    const mockDeployments = {
      items: [
        {
          metadata: {
            name: 'test-deployment',
            namespace: 'default'
          },
          spec: {
            replicas: 2
          },
          status: {
            availableReplicas: 2
          }
        }, {
          metadata: {
            name: 'test-deployment-degraded',
            namespace: 'default'
          },
          spec: {
            replicas: 2
          },
          status: {
            availableReplicas: 1
          }
        }
      ]
    };

    mockListDeploymentForAllNamespaces.mockResolvedValue(mockDeployments);

    const { server } = await startTestBackend({
      features: [platformInsightsPlugin],
    });

    const response = await request(server)
      .get('/api/platform-insights/v1/summary')
      .expect(200);

    expect(response.body).toEqual({
      default: [
        {
          name: 'test-deployment',
          replicas: 2,
          availableReplicas: 2,
          status: 'healthy'
        }, {
          name: 'test-deployment-degraded',
          replicas: 2,
          availableReplicas: 1,
          status: 'degraded'
        }
      ]
    });
  });

  it('should handle Kubernetes API errors gracefully', async () => {
    // Mock Kubernetes API error
    mockListDeploymentForAllNamespaces.mockRejectedValue(
      new Error('Failed to connect to cluster')
    );

    const { server } = await startTestBackend({
      features: [platformInsightsPlugin],
    });

    await request(server)
      .get('/api/platform-insights/v1/summary')
      .expect(500, {
        error: 'Failed to fetch deployments',
      });
  });
});
