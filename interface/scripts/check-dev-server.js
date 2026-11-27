process.env.NODE_ENV = 'development'

const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const http = require('http')
const {createRequire} = require('module')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const DevServer = require('webpack-dev-server')
const config = require('../craco.config')
const poolConfig = require('../pool.config')

function request(port, url, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({hostname: '127.0.0.1', port, path: url,
      method: body ? 'POST' : 'GET', headers}, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: data}))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => req.destroy(new Error('Request timed out')))
    req.end(body)
  })
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-pool-dev-server-'))
  const backends = []
  let devServer
  try {
    const targets = new Map()
    for (const space of ['core', 'eSpace']) {
      const backend = http.createServer((req, res) => {
        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({space, url: req.url, method: req.method, payload: JSON.parse(body)}))
        })
      })
      backends.push(backend)
      await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve))
      targets.set(poolConfig.testnet[space].RPC, `http://127.0.0.1:${backend.address().port}`)
    }

    const source = path.join(directory, 'entry.js')
    fs.writeFileSync(source, 'console.log("PoS pool development server regression")')
    const compiler = webpack({mode: 'development', entry: source,
      output: {path: directory, filename: 'bundle.js', publicPath: '/'},
      plugins: [new HtmlWebpackPlugin({templateContent: '<!doctype html><html><body>Regression fixture</body></html>'})],
      infrastructureLogging: {level: 'error'}})
    const compiled = new Promise((resolve, reject) => {
      compiler.hooks.done.tap('SecurityRegression', stats => {
        if (stats.hasErrors()) reject(new Error(stats.toString({all: false, errors: true})))
        else resolve()
      })
      compiler.hooks.failed.tap('SecurityRegression', reject)
    })
    const stockConfig = require('react-scripts/config/webpackDevServer.config')(undefined, '127.0.0.1')
    const options = config.devServer(stockConfig)
    options.proxy = options.proxy.map(proxy => {
      assert(targets.has(proxy.target), 'RPC proxy target must come from pool.config.js')
      return {...proxy, target: targets.get(proxy.target)}
    })
    devServer = new DevServer({...options, host: '127.0.0.1', port: 0,
      open: false, client: false, hot: false, liveReload: false,
      devMiddleware: {publicPath: '/', stats: 'errors-only'}}, compiler)
    await devServer.start()
    await compiled
    const {port} = devServer.server.address()

    for (const [prefix, space] of [['/core-rpc', 'core'], ['/eSpace-rpc', 'eSpace']]) {
      const payload = {jsonrpc: '2.0', id: 1, method: 'regression_probe', params: []}
      const response = await request(port, prefix, {'Content-Type': 'application/json'}, JSON.stringify(payload))
      assert.strictEqual(response.status, 200)
      assert.deepStrictEqual(JSON.parse(response.body), {space, url: '/', method: 'POST', payload})
    }
    assert.strictEqual((await request(port, '/pool/core/sample', {Accept: 'text/html'})).status, 200)
    assert.strictEqual((await request(port, '/bundle.js')).headers['cross-origin-resource-policy'], 'same-origin')
    assert.strictEqual((await request(port, '/bundle.js', {Host: '%'})).status, 403)
    assert.strictEqual((await request(port, '/webpack-dev-server/invalidate', {Origin: '%'})).status, 403)
    assert.strictEqual((await request(port, '/webpack-dev-server/invalidate', {'Sec-Fetch-Site': 'cross-site'})).status, 403)

    const WebSocket = createRequire(require.resolve('webpack-dev-server'))('ws')
    await new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`, {origin: 'https://attacker.invalid'})
      let blocked = false
      const timeout = setTimeout(() => {
        socket.terminate()
        reject(new Error('Cross-origin WebSocket was not rejected'))
      }, 5000)
      socket.on('message', message => {
        const {type, data} = JSON.parse(message.toString())
        if (type === 'error' && data === 'Invalid Host/Origin header') blocked = true
      })
      socket.on('error', reject)
      socket.on('close', () => {
        clearTimeout(timeout)
        if (blocked) resolve()
        else reject(new Error('Missing cross-origin rejection'))
      })
    })
    assert.strictEqual((await request(port, '/bundle.js')).status, 200)
    console.log('PASS: RPC proxies, SPA fallback, malformed headers, CSRF and WebSocket origin checks')
  } finally {
    if (devServer) await devServer.stop()
    await Promise.all(backends.map(backend => new Promise(resolve => backend.close(resolve))))
    fs.rmSync(directory, {recursive: true, force: true})
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
