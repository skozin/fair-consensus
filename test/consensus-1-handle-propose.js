const assert = require('assert')

const Effects = require('../src/effects')
const {State: ConsensusState, handlePropose} = require('../src/consensus')

const TestRunner = require('./utils/test-runner')

describe('On-chain consensus, handlePropose', () => {
  const config = {total_shares: 4, blocktime: 20}

  const validators = new Array(4).fill(0).map((_, i) => makeVaidator(i))

  function makeVaidator(index) {
    return {
      id: `validator-${index}`,
      username: `validator-${index}`,
      location: '',
      website: '',
      // TODO: use something more realistic
      pubkey: `8badf00d${index}${index}`,
      block_pubkey: Buffer.from(`deadbeef${index}${index}`, 'hex'),
      missed_blocks: [],
      shares: 1,
    }
  }

  function makeProposalFrom(validator) {
    return {
      pubkey: validator.block_pubkey,
      sig: Buffer.alloc(10),
      header: Buffer.alloc(10),
      orderedTxBody: [],
    }
  }

  const effectHandlers = {
    [Effects.getConfig.type]: () => ({...config}),
    [Effects.getValidators.type]: () => [...validators],
    [Effects.getTimestamp.type]: () => 0,
    [Effects.ecVerify.type]: ({header, sig, pubkey}) => true,
    [Effects.getProposedBlock.type]: () => ({locked: false}),
    [Effects.verifyBlock.type]: ({header, orderedTxBody}) => true,
  }

  it(`saves proposed block if everything's ok`, async () => {
    const consensusState = {state: ConsensusState.PROPOSE}

    const time = 30
    const proposal = makeProposalFrom(validators[1])

    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.getTimestamp.type]: () => time,
    })

    const effect = await runner.resumeAndRunUntilEffect(Effects.saveProposedBlock.type)

    assert(effect.block.proposer.equals(validators[1].block_pubkey), `proposer should match`)

    const result = await runner.resumeAndRunUntilFinish()
    assert(result === true, `should return true`)
  })

  it('ignores proposals sent while not in "propose" state', async () => {
    const consensusState = {state: ConsensusState.PREVOTE}
    const proposal = makeProposalFrom(validators[0])
    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.saveProposedBlock.type]: () => assert(false, `should not save proposed block`),
    })
    const result = await runner.resumeAndRunUntilFinish()
    assert(result === false)
  })

  it(`ignores proposals that have no corresponding validator`, async () => {
    const consensusState = {state: ConsensusState.PROPOSE}

    const proposal = makeProposalFrom(validators[0])
    proposal.pubkey = Buffer.from('112233', 'hex')

    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.saveProposedBlock.type]: () => assert(false, `should not save proposed block`),
    })

    const result = await runner.resumeAndRunUntilFinish()
    assert(result === false)
  })

  it(`ignores proposals from non-egligible validators`, async () => {
    const consensusState = {state: ConsensusState.PROPOSE}

    const time = 10

    // the second validator will become egligible starting from time = 20
    const proposal = makeProposalFrom(validators[1])

    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.getTimestamp.type]: () => time,
      [Effects.saveProposedBlock.type]: () => assert(false, `should not save proposed block`),
    })

    const result = await runner.resumeAndRunUntilFinish()
    assert(result === false)
  })

  it(`ignores proposals when locked on some previous block`, async () => {
    const consensusState = {state: ConsensusState.PROPOSE}
    const proposal = makeProposalFrom(validators[0])

    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.getProposedBlock.type]: () => ({locked: true}),
      [Effects.saveProposedBlock.type]: () => assert(false, `should not save proposed block`),
    })

    const result = await runner.resumeAndRunUntilFinish()
    assert(result === false)
  })

  it(`ignores block proposals that don't pass verification`, async () => {
    const consensusState = {state: ConsensusState.PROPOSE}
    const proposal = makeProposalFrom(validators[0])

    const runner = new TestRunner(handlePropose(consensusState, proposal), {
      ...effectHandlers,
      [Effects.verifyBlock.type]: ({header, orderedTxBody}) => false,
      [Effects.saveProposedBlock.type]: () => assert(false, `should not save proposed block`),
    })

    const result = await runner.resumeAndRunUntilFinish()
    assert(result === false)
  })
})
