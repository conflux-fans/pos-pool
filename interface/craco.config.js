const TestServerUrl = 'http://101.132.158.162:12537'
const ProxyConfig = {
  target: TestServerUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/rpc': '',
  },
}

module.exports = {
  style: {
    postcss: {
      plugins: [require('tailwindcss'),require('autoprefixer')],
    },
  },
  devServer: {
    historyApiFallback: true,
    proxy: {
      '/rpc': ProxyConfig,
    },
  },
}
