/* eslint-env mocha */
const assert = require('assert')
const fs = require('fs')

const Snax = require('.')
const {ecc} = Snax.modules
const {Keystore} = require('@snaxfoundation/snaxjs-keygen')

const wif = '5KQwrPbwdL6PhXujxW37FSSQZ1JiwsST4cqQzDeyXtP79zkvFD3'

describe('version', () => {
  it('exposes a version number', () => {
    assert.ok(Snax.version)
  })
})

describe('offline', () => {
  const headers = {
    expiration: new Date().toISOString().split('.')[0], // Don't use `new Date` in production
    ref_block_num: 1,
    ref_block_prefix: 452435776,
    max_net_usage_words: 0,
    max_cpu_usage_ms: 0,
    delay_sec: 0,
    context_free_actions: [],
    transaction_extensions: []
  }


  it('multi-signature', async function() {
    const transactionHeaders = (expireInSeconds, callback) => {
      callback(null/*error*/, headers)
    }
    const snax = Snax({
      keyProvider: [
        ecc.seedPrivate('key1'),
        ecc.seedPrivate('key2')
      ],
      httpEndpoint: null,
      transactionHeaders
    })

    const trx = await snax.nonce(1, {authorization: 'inita'})
    assert.equal(trx.transaction.signatures.length, 2, 'signature count')
  })

  describe('custom transactions', function () {
    const nonce = {
      account: 'snax.null',
      name: 'nonce',
      data: '010f'
    }

    const authorization = [{
      actor: 'inita',
      permission: 'active'
    }]

    const snax = Snax({
      keyProvider: wif
    })

    it('context_free_actions', async function() {
      await snax.transaction({
        context_free_actions: [nonce],// can't have authorization
        actions: [
          // only action, needs an authorization
          Object.assign({}, nonce, {authorization})
        ]
      })
    })

    it('nonce', async function() {
      const trx = await snax.transaction({
        actions: [ Object.assign({}, nonce, {authorization}) ],
      })
    })
  })

  describe('transaction headers', async function() {
    const headerOverrides = {
      max_net_usage_words: 333,
      max_cpu_usage_ms: 222,
      delay_sec: 369
    }

    const transactionHeaders = Object.assign({}, headers, headerOverrides)
    const xfer = ['few', 'many', '100.0000 SNAX', ''/*memo*/]

    it('global', async function() {
      const snax = Snax({
        keyProvider: wif,
        httpEndpoint: null,
        transactionHeaders
      })

      const trx = await snax.transfer(...xfer)

      assert.deepEqual({
        expiration: trx.transaction.transaction.expiration,
        ref_block_num: trx.transaction.transaction.ref_block_num,
        ref_block_prefix: trx.transaction.transaction.ref_block_prefix,
        max_net_usage_words: trx.transaction.transaction.max_net_usage_words,
        max_cpu_usage_ms: trx.transaction.transaction.max_cpu_usage_ms,
        delay_sec: trx.transaction.transaction.delay_sec,
        context_free_actions: [],
        transaction_extensions: []
      }, transactionHeaders)

      assert.equal(trx.transaction.signatures.length, 1, 'signature count')
    })

    const snax = Snax({
      sign: false,
      broadcast: false,
      keyProvider: wif,
      httpEndpoint: null,
      transactionHeaders: headers
    })

    it('object', async function() {
      const trx = await snax.transaction({
        delay_sec: 369,
        actions: [{
          account: 'snax.null',
          name: 'nonce',
          data: '010f',
          authorization: [{actor: 'inita', permission: 'owner'}]
        }]
      })
      assert.equal(trx.transaction.transaction.delay_sec, 369, 'delay_sec')
    })

    it('action', async function() {
      const trx = await snax.transfer(...xfer, {delay_sec: 369})
      assert.equal(trx.transaction.transaction.delay_sec, 369, 'delay_sec')
    })

    it('callback', async function() {
      const trx = await snax.transaction(tr => {tr.transfer(...xfer)}, {delay_sec: 369})
      assert.equal(trx.transaction.transaction.delay_sec, 369, 'delay_sec')
    })

    it('contract', async function() {
      const trx = await snax.transaction('snax.token',
        snax_token => { snax_token.transfer(...xfer) },
        {delay_sec: 369}
      )
      assert.equal(trx.transaction.transaction.delay_sec, 369, 'delay_sec')
    })

  })

  it('load abi', async function() {
    const snax = Snax({httpEndpoint: null})

    const abiBuffer = fs.readFileSync(`docker/contracts/snax.bios/snax.bios.abi`)
    const abiObject = JSON.parse(abiBuffer)

    assert.deepEqual(abiObject, snax.fc.abiCache.abi('snax.bios', abiBuffer).abi)
    assert.deepEqual(abiObject, snax.fc.abiCache.abi('snax.bios', abiObject).abi)

    const bios = await snax.contract('snax.bios')
    assert(typeof bios.newaccount === 'function', 'unrecognized contract')
  })

})

// describe('networks', () => {
//   it('testnet', (done) => {
//     const snax = Snax()
//     snax.getBlock(1, (err, block) => {
//       if(err) {
//         throw err
//       }
//       done()
//     })
//   })
// })

describe('Contracts', () => {
  it('Messages do not sort', async function() {
    const local = Snax()
    const opts = {sign: false, broadcast: false}
    const tx = await local.transaction(['currency', 'snax.token'], ({currency, snax_token}) => {
      // make sure {account: 'snax.token', ..} remains first
      snax_token.transfer('inita', 'initd', '1.1000 SNAX', '')

      // {account: 'currency', ..} remains second (reverse sort)
      currency.transfer('inita', 'initd', '1.2000 CUR', '')

    }, opts)
    assert.equal(tx.transaction.transaction.actions[0].account, 'snax.token')
    assert.equal(tx.transaction.transaction.actions[1].account, 'currency')
  })
})

describe('Contract', () => {
  function deploy(contract, account = 'inita') {
    it(`deploy ${contract}@${account}`, async function() {
      this.timeout(4000)
      // console.log('todo, skipping deploy ' + `${contract}@${account}`)
      const config = {binaryen: require("binaryen"), keyProvider: wif}
      const snax = Snax(config)

      const wasm = fs.readFileSync(`docker/contracts/${contract}/${contract}.wasm`)
      const abi = fs.readFileSync(`docker/contracts/${contract}/${contract}.abi`)


      await snax.setcode(account, 0, 0, wasm)
      await snax.setabi(account, JSON.parse(abi))

      const code = await snax.getAbi(account)

      const diskAbi = JSON.parse(abi)
      delete diskAbi.____comment
      if(!diskAbi.error_messages) {
        diskAbi.error_messages = []
      }

      assert.deepEqual(diskAbi, code.abi)
    })
  }

  // When ran multiple times, deploying to the same account
  // avoids a same contract version deploy error.
  // TODO: undeploy contract instead (when API allows this)

  deploy('snax.msig')
  deploy('snax.token')
  deploy('snax.bios')
  deploy('snax.system')
})

describe('Contracts Load', () => {
  function load(name) {
    it(name, async function() {
      const snax = Snax()
      const contract = await snax.contract(name)
      assert(contract, 'contract')
    })
  }
  load('snax')
  load('snax.token')
})

describe('keyProvider', () => {
  const keyProvider = () => {
    return [wif]
  }

  it('global', async function() {
    const snax = Snax({keyProvider})
    await snax.transfer('inita', 'initb', '1.0001 SNAX', '')
  })

  it('per-action', async function() {
    const snax = Snax()

    await snax.transfer('inita', 'initb', '1.0002 SNAX', '', {keyProvider})

    await snax.transaction(tr => {
      tr.transfer('inita', 'initb', '1.0003 SNAX', '')
    }, {keyProvider})

    const token = await snax.contract('snax.token')
    await token.transfer('inita', 'initb', '1.0004 SNAX', '', {keyProvider})
  })

  it('multiple private keys (get_required_keys)', () => {
    // keyProvider should return an array of keys
    const keyProvider = () => {
      return [
        '5K84n2nzRpHMBdJf95mKnPrsqhZq7bhUvrzHyvoGwceBHq8FEPZ',
        wif
      ]
    }

    const snax = Snax({keyProvider})

    return snax.transfer('inita', 'initb', '1.2740 SNAX', '', false).then(tr => {
      assert.equal(tr.transaction.signatures.length, 1)
      assert.equal(typeof tr.transaction.signatures[0], 'string')
    })
  })

  // If a keystore is used, the keyProvider should return available
  // public keys first then respond with private keys next.
  it('public keys then private key', () => {
    const pubkey = ecc.privateToPublic(wif)

    // keyProvider should return a string or array of keys.
    const keyProvider = ({transaction, pubkeys}) => {
      if(!pubkeys) {
        assert.equal(transaction.actions[0].name, 'transfer')
        return [pubkey]
      }

      if(pubkeys) {
        assert.deepEqual(pubkeys, [pubkey])
        return [wif]
      }
      assert(false, 'unexpected keyProvider callback')
    }

    const snax = Snax({keyProvider})

    return snax.transfer('inita', 'initb', '9.0000 SNAX', '', false).then(tr => {
      assert.equal(tr.transaction.signatures.length, 1)
      assert.equal(typeof tr.transaction.signatures[0], 'string')
    })
  })

  it('from snaxjs-keygen', () => {
    const keystore = Keystore('uid')
    keystore.deriveKeys({parent: wif})
    const snax = Snax({keyProvider: keystore.keyProvider})
    return snax.transfer('inita', 'initb', '12.0000 SNAX', '', true)
  })

  it('return Promise', () => {
    const snax = Snax({keyProvider: new Promise(resolve => {resolve(wif)})})
    return snax.transfer('inita', 'initb', '1.6180 SNAX', '', true)
  })
})

describe('signProvider', () => {
  it('custom', function() {
    const customSignProvider = ({buf, sign, transaction}) => {

      // All potential keys (SNAX6MRy.. is the pubkey for 'wif')
      const pubkeys = ['SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV']

      return snax.getRequiredKeys(transaction, pubkeys).then(res => {
        // Just the required_keys need to sign
        assert.deepEqual(res.required_keys, pubkeys)
        return sign(buf, wif) // return hex string signature or array of signatures
      })
    }

    const snax = Snax({signProvider: customSignProvider})
    return snax.transfer('inita', 'initb', '2.0000 SNAX', '', false)
  })
})

describe('transactions', () => {
  const signProvider = ({sign, buf}) => sign(buf, wif)
  const promiseSigner = (args) => Promise.resolve(signProvider(args))

  it('usage', () => {
    const snax = Snax({signProvider})
    snax.setprods()
  })

  it('create asset', async function() {
    const snax = Snax({signProvider})
    const pubkey = 'SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    const auth = {authorization: 'snax.token'}
    await snax.create('snax.token', '10000 ' + randomAsset(), auth)
    await snax.create('snax.token', '10000.00 ' + randomAsset(), auth)
  })

  it('newaccount (broadcast)', () => {
    const snax = Snax({signProvider})
    const pubkey = 'SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    const name = randomName()

    return snax.transaction(tr => {
      tr.newaccount({
        creator: 'snax',
        name,
        owner: pubkey,
        active: pubkey
      })

      tr.buyrambytes({
        payer: 'snax',
        receiver: name,
        bytes: 8192
      })

      tr.delegatebw({
        from: 'snax',
        receiver: name,
        stake_net_quantity: '10.0000 SNAX',
        stake_cpu_quantity: '10.0000 SNAX',
        transfer: 0
      })
    })
  })

  it('mockTransactions pass', () => {
    const snax = Snax({signProvider, mockTransactions: 'pass'})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '').then(transfer => {
      assert(transfer.mockTransaction, 'transfer.mockTransaction')
    })
  })

  it('mockTransactions fail', () => {
    const snax = Snax({signProvider, mockTransactions: 'fail'})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '').catch(error => {
      assert(error.indexOf('fake error') !== -1, 'expecting: fake error')
    })
  })

  it('transfer (broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '')
  })

  it('transfer custom token precision (broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transfer('inita', 'initb', '1.618 PHI', '')
  })

  it('transfer custom authorization (broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '', {authorization: 'inita@owner'})
  })

  it('transfer custom authorization (permission only)', async () => {
    const snax = Snax({signProvider, broadcast: false, authorization: '@posting'})
    const tr = await snax.transfer('inita', 'initb', '1.0000 SNAX', '')
    assert.deepEqual(
      tr.transaction.transaction.actions[0].authorization,
      [{actor: 'inita', permission: 'posting'}]
    )
  })

  it('transfer custom global authorization', async () => {
    const authorization = [{actor: 'inita', permission: 'posting'}]
    const snax = Snax({signProvider, authorization, broadcast: false})
    const tr = await snax.transfer('inita', 'initb', '1.0000 SNAX', '')
    assert.deepEqual(
      tr.transaction.transaction.actions[0].authorization,
      authorization
    )
  })

  it('transfer custom authorization sorting (no broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '',
      {authorization: ['initb@owner', 'inita@owner'], broadcast: false}
    ).then(({transaction}) => {
      const ans = [
        {actor: 'inita', permission: 'owner'},
        {actor: 'initb', permission: 'owner'}
      ]
      assert.deepEqual(transaction.transaction.actions[0].authorization, ans)
    })
  })

  it('transfer (no broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '', {broadcast: false})
  })

  it('transfer (no broadcast, no sign)', () => {
    const snax = Snax({signProvider})
    const opts = {broadcast: false, sign: false}
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '', opts).then(tr =>
      assert.deepEqual(tr.transaction.signatures, [])
    )
  })

  it('transfer sign promise (no broadcast)', () => {
    const snax = Snax({signProvider: promiseSigner})
    return snax.transfer('inita', 'initb', '1.0000 SNAX', '', false)
  })

  it('action to unknown contract', done => {
    Snax({signProvider}).contract('unknown432')
    .then(() => {throw 'expecting error'})
    .catch(error => { // eslint-disable-line handle-callback-err
      done()
    })
  })

  it('action to contract', () => {
    return Snax({signProvider}).contract('snax.token').then(token => {
      return token.transfer('inita', 'initb', '1.0000 SNAX', '')
        // transaction sent on each command
        .then(tr => {
          assert.equal(1, tr.transaction.transaction.actions.length)

          return token.transfer('initb', 'inita', '1.0000 SNAX', '')
            .then(tr => {assert.equal(1, tr.transaction.transaction.actions.length)})
        })
    }).then(r => {assert(r == undefined)})
  })

  it('action to contract atomic', async function() {
    let amt = 1 // for unique transactions
    const snax = Snax({signProvider})

    const trTest = snax_token => {
      assert(snax_token.transfer('inita', 'initb', amt + '.0000 SNAX', '') == null)
      assert(snax_token.transfer('initb', 'inita', (amt++) + '.0000 SNAX', '') == null)
    }

    const assertTr = tr =>{
      assert.equal(2, tr.transaction.transaction.actions.length)
    }

    //  contracts can be a string or array
    await assertTr(await snax.transaction(['snax.token'], ({snax_token}) => trTest(snax_token)))
    await assertTr(await snax.transaction('snax.token', snax_token => trTest(snax_token)))
  })

  it('action to contract (contract tr nesting)', function () {
    this.timeout(4000)
    const tn = Snax({signProvider})
    return tn.contract('snax.token').then(snax_token => {
      return snax_token.transaction(tr => {
        tr.transfer('inita', 'initb', '1.0000 SNAX', '')
        tr.transfer('inita', 'initc', '2.0000 SNAX', '')
      }).then(() => {
        return snax_token.transfer('inita', 'initb', '3.0000 SNAX', '')
      })
    })
  })

  it('multi-action transaction (broadcast)', () => {
    const snax = Snax({signProvider})
    return snax.transaction(tr => {
      assert(tr.transfer('inita', 'initb', '1.0000 SNAX', '') == null)
      assert(tr.transfer({from: 'inita', to: 'initc', quantity: '1.0000 SNAX', memo: ''}) == null)
    }).then(tr => {
      assert.equal(2, tr.transaction.transaction.actions.length)
    })
  })

  it('multi-action transaction no inner callback', () => {
    const snax = Snax({signProvider})
    return snax.transaction(tr => {
      tr.transfer('inita', 'inita', '1.0000 SNAX', '', cb => {})
    })
    .then(() => {throw 'expecting rollback'})
    .catch(error => {
      assert(/Callback during a transaction/.test(error), error)
    })
  })

  it('multi-action transaction error rollback', () => {
    const snax = Snax({signProvider})
    return snax.transaction(tr => {throw 'rollback'})
    .then(() => {throw 'expecting rollback'})
    .catch(error => {
      assert(/rollback/.test(error), error)
    })
  })

  it('multi-action transaction Promise.reject rollback', () => {
    const snax = Snax({signProvider})
    return snax.transaction(tr => Promise.reject('rollback'))
    .then(() => {throw 'expecting rollback'})
    .catch(error => {
      assert(/rollback/.test(error), error)
    })
  })

  it('custom transaction', () => {
    const snax = Snax({signProvider})
    return snax.transaction(
      {
        actions: [
          {
            account: 'snax.token',
            name: 'transfer',
            data: {
              from: 'inita',
              to: 'initb',
              quantity: '13.0000 SNAX',
              memo: '爱'
            },
            authorization: [{
              actor: 'inita',
              permission: 'active'
            }]
          }
        ]
      },
      {broadcast: false}
    )
  })

  it('custom contract transfer', async function() {
    const snax = Snax({signProvider})
    await snax.contract('currency').then(currency =>
      currency.transfer('currency', 'inita', '1.0000 CUR', '')
    )
  })
})

it('Transaction ABI cache', async function() {
  const snax = Snax()
  assert.throws(() => snax.fc.abiCache.abi('snax.msig'), /not cached/)
  const abi = await snax.fc.abiCache.abiAsync('snax.msig')
  assert.deepEqual(abi, await snax.fc.abiCache.abiAsync('snax.msig', false/*force*/))
  assert.deepEqual(abi, snax.fc.abiCache.abi('snax.msig'))
})

it('Transaction ABI lookup', async function() {
  const snax = Snax()
  const tx = await snax.transaction(
    {
      actions: [
        {
          account: 'currency',
          name: 'transfer',
          data: {
            from: 'inita',
            to: 'initb',
            quantity: '13.0000 CUR',
            memo: ''
          },
          authorization: [{
            actor: 'inita',
            permission: 'active'
          }]
        }
      ]
    },
    {sign: false, broadcast: false}
  )
  assert.equal(tx.transaction.transaction.actions[0].account, 'currency')
})

const randomName = () => {
  const name = String(Math.round(Math.random() * 1000000000)).replace(/[0,6-9]/g, '')
  return 'a' + name + '111222333444'.substring(0, 11 - name.length) // always 12 in length
}

const randomAsset = () =>
  ecc.sha256(String(Math.random())).toUpperCase().replace(/[^A-Z]/g, '').substring(0, 7)
