const poolConfig = require('./pool.config');

module.exports = {
  devServer: devServerConfig => {
    const {
      https,
      onBeforeSetupMiddleware,
      onAfterSetupMiddleware,
      setupMiddlewares,
      ...config
    } = devServerConfig;
    const paths = require('react-scripts/config/paths');

    return {
      ...config,
      allowedHosts: 'auto',
      // CRA's wildcard CORS header would opt out of the server's origin protection.
      headers: { 'Cross-Origin-Resource-Policy': 'same-origin' },
      server: https ? { type: 'https', options: https === true ? {} : https } : 'http',
      proxy: [{
        context: ['/core-rpc'],
        target: poolConfig.testnet.core.RPC,
        changeOrigin: true,
        pathRewrite: {
          '^/core-rpc': '',
        },
      }, {
        context: ['/eSpace-rpc'],
        target: poolConfig.testnet.eSpace.RPC,
        changeOrigin: true,
        pathRewrite: {
          '^/eSpace-rpc': '',
        },
      }],
      setupMiddlewares: (middlewares, devServer) => {
        if (onBeforeSetupMiddleware) onBeforeSetupMiddleware(devServer);
        // Replace CRA's removed onAfterSetupMiddleware hook after the proxy handlers.
        middlewares.push({
          name: 'redirect-served-path',
          middleware: require('react-dev-utils/redirectServedPathMiddleware')(paths.publicUrlOrPath),
        }, {
          name: 'noop-service-worker',
          middleware: require('react-dev-utils/noopServiceWorkerMiddleware')(paths.publicUrlOrPath),
        });
        return setupMiddlewares ? setupMiddlewares(middlewares, devServer) : middlewares;
      },
    };
  },
  webpack: {
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      return webpackConfig;
    }
  },
  jest: {
    configure: jestConfig => ({
      ...jestConfig,
      moduleNameMapper: {
        ...jestConfig.moduleNameMapper,
        '^react-router/dom$': require('path').join(
          require('path').dirname(require.resolve('react-router/package.json')),
          'dist/development/dom-export.js'
        ),
      },
    }),
  },
  babel: {
    plugins: [
      ['@babel/plugin-proposal-private-property-in-object', { loose: true }],
      ['@babel/plugin-transform-class-properties', { loose: true }],
      ['@babel/plugin-transform-private-methods', { loose: true }],
      '@babel/plugin-proposal-optional-chaining',
    ]
  }
}
