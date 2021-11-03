const TestServerUrl = ''
const ProxyConfig = {
  target: TestServerUrl,
  changeOrigin: true,
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
      '/': ProxyConfig,
    },
  },
}
