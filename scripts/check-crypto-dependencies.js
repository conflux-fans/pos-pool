const assert = require('assert')
const crypto = require('crypto')
const path = require('path')
const {createRequire} = require('module')
const {execFileSync} = require('child_process')

async function checkCryptoDependencies(manifest) {
  const localRequire = createRequire(path.resolve(manifest))
  const ethersRequire = createRequire(localRequire.resolve('@ethersproject/bignumber'))
  const bnModules = [...new Set([
    localRequire.resolve('bn.js'),
    ethersRequire.resolve('bn.js'),
  ])]
  // Vulnerable BN versions hang after maskn(0); keep that regression bounded.
  execFileSync(process.execPath, ['-e', `
    const assert = require('assert');
    for (const filename of process.argv.slice(1)) {
      const BN = require(filename);
      assert.strictEqual(new BN(123).maskn(0).toString(), '0');
      assert.strictEqual(new BN('123456789').mul(new BN(10)).toString(), '1234567890');
    }
  `, ...bnModules], {timeout: 3000})

  const {Message} = localRequire('js-conflux-sdk')
  const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const hash = '0x592fa743889fc7f92ac2a37bb1f5ba1daf2a5c84741ca0e0061d243a2e6707ba'
  const signature = Message.sign(privateKey, hash)
  assert.strictEqual(signature, '0x6e913e2b76459f19ebd269b82b51a70e912e909b2f5c002312efc27bcc280f3c29134d382aad0dbd3f0ccc9f0eb8f1dbe3f90141d81574ebb6504156b0d7b95f01')
  assert.strictEqual(Message.recover(signature, hash), '0x4646ae5047316b4230d0086c8acec687f00b1cd9d1dc634f6cb358ac0a9a8ffffe77b4dd0a4bfb95851f3b7355c781dd60f8418fc8a65d14907aff47c903a559')

  const {Wallet, utils} = localRequire('ethers')
  const wallet = new Wallet(privateKey)
  assert.strictEqual(utils.verifyMessage('PoS pool regression', await wallet.signMessage('PoS pool regression')), wallet.address)
  assert.strictEqual(utils.parseEther('1.23456789').toString(), '1234567890000000000')

  const password = 'long-password'.repeat(256)
  const expectedKey = crypto.pbkdf2Sync(password, 'salt', 4, 64, 'sha512')
  assert.strictEqual(localRequire('@ethersproject/pbkdf2').pbkdf2(Buffer.from(password), Buffer.from('salt'), 4, 64, 'sha512'),
    `0x${expectedKey.toString('hex')}`)
  let pbkdf2Module
  try {
    pbkdf2Module = localRequire.resolve('pbkdf2')
  } catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') throw error
  }
  if (pbkdf2Module) {
    assert.deepStrictEqual(localRequire(pbkdf2Module).pbkdf2Sync(password, 'salt', 4, 64, 'sha512'), expectedKey)
  }
  console.log('PASS: BN zero masks, Conflux/EVM signatures, unit conversion and PBKDF2')
}

module.exports = checkCryptoDependencies

if (require.main === module) {
  checkCryptoDependencies(process.argv[2] || 'package.json').catch(error => {
    console.error(error)
    process.exitCode = 1
  })
}
