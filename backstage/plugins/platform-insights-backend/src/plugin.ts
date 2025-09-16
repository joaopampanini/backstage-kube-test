import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

/**
 * platformInsightsPlugin backend plugin
 *
 * @public
 */
export const platformInsightsPlugin = createBackendPlugin({
  pluginId: 'platform-insights',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({ logger, httpRouter }) {
        httpRouter.addAuthPolicy({
          path: '/healthz',
          allow: 'unauthenticated',
        });
        httpRouter.addAuthPolicy({
          path: '/v1/summary',
          allow: 'unauthenticated',
        });

        httpRouter.use(
          await createRouter({logger}),
        );
      },
    });
  },
});
