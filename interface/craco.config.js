const poolConfig = require('./pool.config');

module.exports = {
  style: {
    postcss: {
      plugins: [require('tailwindcss'),require('autoprefixer')],
    },
  },
  devServer: {
    historyApiFallback: true,
    proxy: {
      '/core-rpc': {
        target: poolConfig.core.testnet.RPC,
        changeOrigin: true,
        pathRewrite: {
          '^/core-rpc': '',
        },
      },
      '/eSpace-rpc': {
        target: poolConfig.eSpace.testnet.RPC,
        changeOrigin: true,
        pathRewrite: {
          '^/espace-rpc': '',
        },
      }
    },
  },
  webpack: {
    configure: webpackConfig => {
      const scopePluginIndex = webpackConfig.resolve.plugins.findIndex(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      webpackConfig.resolve.plugins.splice(scopePluginIndex, 1);
      return webpackConfig;
    }
  }
}
