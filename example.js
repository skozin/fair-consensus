const {runGenerator} = require('./src/utils/runner')
const {State: ConsensusState, handlePropose} = require('./src/consensus')
const Effects = require('./src/effects')

// This shows how one can connect generator-based logic to the rest
// of application by writing a set of effect handlers.

const validators = new Array(4).fill(0).map((_, i) => makeVaidator(i))

const effectHandlers = {
  [Effects.getConfig.type]: () => ({total_shares: 4, blocktime: 20}),

  [Effects.getValidators.type]: () => validators,

  [Effects.getTimestamp.type]: () => 30,

  [Effects.ecVerify.type]: async ({header, sig, pubkey}) => {
    console.log(`verifying signature...`)
    await delay(1000)
    console.log(`signature is correct!`)
    return true
  },

  [Effects.getProposedBlock.type]: async () => {
    return {locked: false}
  },

  [Effects.verifyBlock.type]: async ({header, orderedTxBody}) => {
    console.log(`verifying block...`)
    await delay(1000)
    console.log(`block is correct!`)
    return true
  },

  [Effects.saveProposedBlock.type]: async () => {
    console.log(`saving proposed block...`)
    await delay(1000)
    console.log(`done!`)
  },
}

const consensusState = {state: ConsensusState.PROPOSE}
const proposal = {
  pubkey: validators[1].block_pubkey,
  sig: Buffer.alloc(10),
  header: Buffer.alloc(10),
  orderedTxBody: [],
}

runGenerator(handlePropose(consensusState, proposal), effectHandlers)
  .then(result => console.log(`result:`, result))
  .catch(err => console.log(`error:`, err.stack))

function makeVaidator(index) {
  return {
    id: `validator-${index}`,
    username: `validator-${index}`,
    location: '',
    website: '',
    pubkey: `8badf00d${index}${index}`,
    block_pubkey: Buffer.from(`deadbeef${index}${index}`, 'hex'),
    missed_blocks: [],
    shares: 1,
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms))
}
