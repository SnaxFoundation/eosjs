/* eslint-env mocha */
const assert = require('assert')
const Fcbuffer = require('fcbuffer')
const ByteBuffer = require('bytebuffer')

const Snax = require('.')

describe('shorthand', () => {

  it('authority', async () => {
    const snax = Snax({keyPrefix: 'PUB'})
    const snaxio = await snax.contract('snax')
    const {authority} = snaxio.fc.structs

    const pubkey = 'PUB6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    const auth = {threshold: 1, keys: [{key: pubkey, weight: 1}]}

    assert.deepEqual(authority.fromObject(pubkey), auth)
    assert.deepEqual(
      authority.fromObject(auth),
      Object.assign({}, auth, {accounts: [], waits: []})
    )
  })

  it('PublicKey sorting', async () => {
    const snax = Snax()
    const snaxio = await snax.contract('snax')
    const {authority} = snaxio.fc.structs

    const pubkeys = [
      'SNAX7wBGPvBgRVa4wQN2zm5CjgBF6S7tP7R3JavtSa2unHUoVQGhey',
      'SNAX6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    ]

    const authSorted = {threshold: 1, keys: [
      {key: pubkeys[1], weight: 1},
      {key: pubkeys[0], weight: 1}
    ], accounts: [], waits: []}

    const authUnsorted = {threshold: 1, keys: [
      {key: pubkeys[0], weight: 1},
      {key: pubkeys[1], weight: 1}
    ], accounts: [], waits: []}

    // assert.deepEqual(authority.fromObject(pubkey), auth)
    assert.deepEqual(authority.fromObject(authUnsorted), authSorted)
  })

  it('public_key', () => {
    const snax = Snax({keyPrefix: 'PUB'})
    const {structs, types} = snax.fc
    const PublicKeyType = types.public_key()
    const pubkey = 'PUB6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV'
    // 02c0ded2bc1f1305fb0faac5e6c03ee3a1924234985427b6167ca569d13df435cf
    assertSerializer(PublicKeyType, pubkey)
  })

  it('symbol', () => {
    const snax = Snax()
    const {types} = snax.fc
    const Symbol = types.symbol()
    assertSerializer(Symbol, '4,SNAX', '4,SNAX', 'SNAX')
  })

  it('symbol_code', () => {
    const snax = Snax({defaults: true})
    const {types} = snax.fc
    const SymbolCode = types.symbol_code()
    assertSerializer(SymbolCode, SymbolCode.toObject())
  })

  it('extended_symbol', () => {
    const snax = Snax({defaults: true})
    const esType = snax.fc.types.extended_symbol()
    // const esString = esType.toObject()
    assertSerializer(esType, '4,SNAX@contract')
  })

  it('asset', () => {
    const snax = Snax()
    const {types} = snax.fc
    const aType = types.asset()
    assertSerializer(aType, '1.0001 SNAX')
  })

  it('extended_asset', () => {
    const snax = Snax({defaults: true})
    const eaType = snax.fc.types.extended_asset()
    assertSerializer(eaType, eaType.toObject())
  })

  it('signature', () => {
    const snax = Snax()
    const {types} = snax.fc
    const SignatureType = types.signature()
    const signatureString = 'SIG_K1_JwxtqesXpPdaZB9fdoVyzmbWkd8tuX742EQfnQNexTBfqryt2nn9PomT5xwsVnUB4m7KqTgTBQKYf2FTYbhkB5c7Kk9EsH'
    //const signatureString = 'SIG_K1_Jzdpi5RCzHLGsQbpGhndXBzcFs8vT5LHAtWLMxPzBdwRHSmJkcCdVu6oqPUQn1hbGUdErHvxtdSTS1YA73BThQFwV1v4G5'
    assertSerializer(SignatureType, signatureString)
  })

})

describe('Snaxio Abi', () => {

  function checkContract(name) {
    it(`${name} contract parses`, (done) => {
      const snax = Snax()

      snax.contract('snax.token', (error, snax_token) => {
        assert(!error, error)
        assert(snax_token.transfer, 'snax.token contract')
        assert(snax_token.issue, 'snax.token contract')
        done()
      })
    })
  }
  checkContract('snax')
  checkContract('snax.token')

  it('abi', async () => {
    const snax = Snax({defaults: true, broadcast: false, sign: false})

    const {abi_def} = snax.fc.structs

    async function setabi(abi) {
      await snax.setabi('inita', abi) // See README
      const buf = snax.fc.toBuffer('abi_def', abi)
      await snax.setabi('inita', buf) // v1/chain/abi_json_to_bin
      await snax.setabi('inita', buf.toString('hex')) // v1/chain/abi_json_to_bin
    }

    const obj = abi_def.toObject()
    const json = JSON.stringify(obj)

    await setabi(obj)
    await setabi(abi_def.fromObject(obj))
    await setabi(abi_def.fromObject(json))
    await setabi(abi_def.fromObject(Buffer.from(json).toString('hex')))
    await setabi(abi_def.fromObject(Buffer.from(json)))
  })
})

describe('Action.data', () => {
  it('json', () => {
    const snax = Snax({forceActionDataHex: false})
    const {structs, types} = snax.fc
    const value = {
      account: 'snax.token',
      name: 'transfer',
      data: {
        from: 'inita',
        to: 'initb',
        quantity: '1.0000 SNAX',
        memo: ''
      },
      authorization: []
    }
    assertSerializer(structs.action, value)
  })

  it('force hex', () => {
    const snax = Snax({forceActionDataHex: true})
    const {structs, types} = snax.fc
    const value = {
      account: 'snax.token',
      name: 'transfer',
      data: {
        from: 'inita',
        to: 'initb',
        quantity: '1.0000 SNAX',
        memo: ''
      },
      authorization: []
    }
    assertSerializer(structs.action, value, value)
  })

  it('unknown action', () => {
    const snax = Snax({forceActionDataHex: false})
    const {structs, types} = snax.fc
    const value = {
      account: 'snax.token',
      name: 'mytype',
      data: '030a0b0c',
      authorization: []
    }
    assert.throws(
      () => assertSerializer(structs.action, value),
      /Missing ABI action/
    )
  })
})

function assertSerializer (type, value, fromObjectResult = null, toObjectResult = fromObjectResult) {
  const obj = type.fromObject(value) // tests fromObject
  const buf = Fcbuffer.toBuffer(type, value) // tests appendByteBuffer
  const obj2 = Fcbuffer.fromBuffer(type, buf) // tests fromByteBuffer
  const obj3 = type.toObject(obj) // tests toObject

  if(!fromObjectResult && !toObjectResult) {
    assert.deepEqual(value, obj3, 'serialize object')
    assert.deepEqual(obj3, obj2, 'serialize buffer')
    return
  }

  if(fromObjectResult) {
    assert(fromObjectResult, obj, 'fromObjectResult')
    assert(fromObjectResult, obj2, 'fromObjectResult')
  }

  if(toObjectResult) {
    assert(toObjectResult, obj3, 'toObjectResult')
  }
}
