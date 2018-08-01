const {runGenerator} = require('./src/utils/runner')
const {MessageQueue} = require('./src/utils/message-queue')
const Effects = require('./src/effects')

const {consensus} = require('./src/consensus')

const peers = ['peer_1', 'peer_2', 'peer_3', 'peer_4']

const validators = peers.map(peerId => makeVaidator(peerId))
const totalShares = validators.reduce((sum, v) => sum + v.shares, 0)
const blockchains = initBlockchains(peers)

const config = {
  blocktime: 5,
  stepLatency: 1,
  totalShares: totalShares,
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
  [Effects.achievedQuorum.type]: ({votes}) => true,
  [Effects.commitValue.type]: ({value}, peerId) => {
    blockchains[peerId].push(value)
    console.log(`⛓️⛓️⛓️  got new block from ${peerId}`, value)
  },
}

validators.forEach(v => {
  const consensusInstance = consensus({...config, ...v})
  runGenerator(consensusInstance, effectHandlers, v.peerId)
    .then(result => console.log(`result:`, result))
    .catch(err => console.log(`error:`, err.stack))
})

function makeVaidator(peerId) {
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
