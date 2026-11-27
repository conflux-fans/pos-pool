const assert = require('assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const postcss = require('postcss')
const {optimize} = require('svgo')

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'pos-pool-security-'))
  try {
    const cssDirectory = path.join(directory, 'css')
    fs.mkdirSync(cssDirectory)
    const sourceMap = JSON.stringify({
      version: 3,
      sources: ['private.css'],
      sourcesContent: ['private content'],
      names: [],
      mappings: 'AAAA',
    })
    const outsideMap = path.join(directory, 'private.map')
    fs.writeFileSync(outsideMap, sourceMap)
    fs.writeFileSync(path.join(cssDirectory, 'local.map'), sourceMap)
    fs.symlinkSync(outsideMap, path.join(cssDirectory, 'linked.map'))

    for (const annotation of ['../private.map', outsideMap, 'linked.map']) {
      const root = postcss.parse(`a {} /*# sourceMappingURL=${annotation} */`, {
        from: path.join(cssDirectory, 'input.css'),
      })
      assert.strictEqual(root.source.input.map, undefined, annotation)
    }
    const local = postcss.parse('a {} /*# sourceMappingURL=local.map */', {
      from: path.join(cssDirectory, 'input.css'),
    })
    assert(local.source.input.map, 'local source maps should still load')
    console.log('PASS: PostCSS blocks source maps outside the CSS directory')

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:s="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><s:script>alert(1)</s:script><s:a href="java&#x09;script:alert(1)"><path d="M0 0h10v10H0z"/></s:a></svg>'
    const cleaned = optimize(svg, {plugins: ['removeScriptElement']}).data
    assert(!cleaned.includes('script'), cleaned)
    assert(cleaned.includes('<path'), 'inert SVG content should be preserved')
    console.log('PASS: SVGO removes namespaced scripts and executable links')

    const svgPath = path.join(directory, 'icon.svg')
    fs.writeFileSync(svgPath, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10v10H0z"/></svg>')
    const component = await new Promise((resolve, reject) => {
      require('@svgr/webpack').default.call({
        resourcePath: svgPath,
        query: {svgo: true, titleProp: true, ref: true},
        fs,
        async: () => (error, result) => error ? reject(error) : resolve(result),
      }, 'export default "icon.svg";')
    })
    assert(component.includes('ReactComponent'), component)
    assert(component.includes('viewBox'), component)
    console.log('PASS: the Webpack SVG loader still exports React components')

    const css = await require('cssnano')().process(
      'a { color: #ffffff; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 10 10\'%3E%3Cpath d=\'M0 0h10v10H0z\'/%3E%3C/svg%3E"); }',
      {from: undefined},
    )
    assert(css.css.includes('color:#fff'), css.css)
    assert(css.css.includes('data:image/svg+xml'), css.css)
    console.log('PASS: CSS minification handles embedded SVGs')

    const lockfile = fs.readFileSync(path.join(__dirname, '../yarn.lock'), 'utf8')
    assert(!/^"?ip@/m.test(lockfile), 'the vulnerable ip dependency must stay removed')
    const dns = require('dns-packet')
    const packet = {
      type: 'response',
      answers: [
        {type: 'A', name: 'pool.local', data: '192.168.1.10'},
        {type: 'AAAA', name: 'pool.local', data: '2001:db8::1'},
      ],
    }
    assert.deepStrictEqual(dns.decode(dns.encode(packet)).answers.map(answer => answer.data),
      packet.answers.map(answer => answer.data))
    console.log('PASS: the vulnerable ip dependency is absent and DNS encoding works')

    const i18n = require('i18next').createInstance()
    const resources = Object.fromEntries(['en', 'zh', 'id', 'ko', 'vn'].map(language => [
      language, {translation: require(`../public/locales/${language}/translation.json`)},
    ]))
    await i18n.init({lng: 'en', resources, interpolation: {escapeValue: false}})
    for (const language of Object.keys(resources)) {
      await i18n.changeLanguage(language)
      assert.strictEqual(i18n.t('Header.pos_pool'), resources[language].translation.Header.pos_pool)
      assert(i18n.t('Header.unspport_network_switch', {network: 'Conflux Testnet'}).includes('Conflux Testnet'))
    }
    const originalCall = Object.getOwnPropertyDescriptor(Object.prototype.hasOwnProperty, 'call')
    try {
      i18n.addResourceBundle('en', 'untrusted', {hasOwnProperty: {call: 'corrupted'}}, true, true)
      assert.strictEqual(Object.prototype.hasOwnProperty.call, Function.prototype.call)
    } finally {
      if (originalCall) Object.defineProperty(Object.prototype.hasOwnProperty, 'call', originalCall)
      else delete Object.prototype.hasOwnProperty.call
    }
    console.log('PASS: all five languages, interpolation and inherited-property isolation')

    const {resolvePath} = require('react-router-dom')
    for (const pathname of ['\\\\attacker.invalid/pool', '/\\attacker.invalid/pool', '\\/attacker.invalid/pool']) {
      const resolved = resolvePath({pathname}, '/pool-manage')
      assert.strictEqual(new URL(resolved.pathname, 'https://pool.example').origin, 'https://pool.example')
    }
    console.log('PASS: backslashes in internal paths cannot redirect to another origin')

    await require('../../scripts/check-crypto-dependencies')(path.join(__dirname, '../package.json'))
  } finally {
    fs.rmSync(directory, {recursive: true, force: true})
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
