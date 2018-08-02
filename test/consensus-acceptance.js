const assert = require('assert')

const Effects = require('../src/effects')

const {MessageQueue} = require('../src/utils/message-queue')
const {consensus} = require('../src/consensus/consensus')

const TestRunner = require('./utils/test-runner')

describe('[Acceptance] Basic tendermint consensus', function() {
  this.timeout(15000)

  const peers = ['peer_1', 'peer_2', 'peer_3', 'peer_4']

  const validators = peers.map(peerId => makeValidator(peerId))
  const totalShares = validators.reduce((sum, v) => sum + v.shares, 0)
  const blockchains = initBlockchains(peers)

  const config = {
    blocktime: 5,
    stepLatency: 1,
    totalShares: totalShares,
    majority: totalShares * 2 / 3,
  }

  const q = new MessageQueue(validators.map(v => v.peerId))

  const effectHandlers = {
    [Effects.getTimestamp.type]: _ => seconds(),
    [Effects.sleep.type]: ({ms}) => delay(ms),

    [Effects.getNextMessages.type]: (_, peerId) => q.dequeue(peerId),
    [Effects.broadcast.type]: async ({msg}, peerId) => {
      await delay(50) // emulate latency
      return q.enqueue(peerId, msg)
    },

    [Effects.getValue.type]: (_, peerId) => `block_${blockchains[peerId].length}`,
    [Effects.getProposerId.type]: _ => {
      return calculateNextValidator(seconds(), validators, config).peerId
    },
    [Effects.achievedQuorum.type]: ({votes}) => {
      const totalShares = validators.reduce(
        (totalShares, v) => totalShares + (votes[v.peerId] ? v.shares : 0),
        0
      )

      return totalShares > config.majority
    },
    [Effects.commitValue.type]: ({value}, peerId) => {
      // console.log('Effects.commitValue.type', value, peerId)
      blockchains[peerId].push(value)
    },
  }

  it(`all nodes have the same set of blocks`, async () => {
    const runners = []
    validators.forEach(v => {
      runners.push(new TestRunner(consensus({...config, ...v}), effectHandlers, v.peerId))
    })

    await Promise.all(runners.map(
      runner => runner.resumeAndRunUntilNEffectsProduced(Effects.commitValue.type, 2)
    ))

    assert(blockchains['peer_1'].length == 1)
    assert(blockchains['peer_2'].length == 1)
    assert(blockchains['peer_3'].length == 1)
    assert(blockchains['peer_4'].length == 1)

    assert(blockchains['peer_1'].indexOf('block_0') !== -1)
    assert(blockchains['peer_2'].indexOf('block_0') !== -1)
    assert(blockchains['peer_3'].indexOf('block_0') !== -1)
    assert(blockchains['peer_4'].indexOf('block_0') !== -1)
  })
})

function makeValidator(peerId) {
  return {
    peerId,
    shares: 1,
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function seconds() {
  return Math.floor(Date.now() / 1000)
}


function calculateNextValidator(timestamp, validators, config) {
  const currentIndex = Math.floor(timestamp / config.blocktime) % config.total_shares
  let searchIndex = 0

  for (let i = 0; i < validators.length; i++) {
    const current = validators[i]
    searchIndex += current.shares

    if (searchIndex <= currentIndex) continue

    // go back to 0
    if (currentIndex + 1 == config.total_shares) return validators[0]

    // same validator
    if (currentIndex + 1 < searchIndex) return current

    // next validator
    return validators[i + 1]
  }
}

function initBlockchains(array) {
  return array.reduce((obj, item) => {
    obj[item] = []
    return obj
  }, {})
}
