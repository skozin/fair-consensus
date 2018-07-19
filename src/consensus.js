const Effects = require('./effects')
const bin = require('./utils/bin')

const State = {
  PROPOSE: 'propose',
  PREVOTE: 'prevote',
  PRECOMMIT: 'precommit',
  AWAIT: 'await',
}

exports.State = State
exports.handlePropose = handlePropose

function* handlePropose(consensusState, {pubkey, sig, header, orderedTxBody}) {
  if (consensusState.state !== State.PROPOSE) {
    // l(`${state} not propose`)
    return false
  }

  const validators = yield Effects.getValidators()
  const proposer = validators.find(f => f.block_pubkey.equals(pubkey))

  if (!proposer) {
    // l(`proposer not found in validators list`)
    return false
  }

  if (header.length < 5) {
    // l(`${proposer.id} voted nil`)
    return false
  }

  const config = yield Effects.getConfig()
  const nextValidator = calculateNextValidator(yield Effects.getTimestamp(), validators, config)

  if (proposer !== nextValidator) {
    // l(`You ${proposer.id} are not the current proposer ${nextValidator.id}`)
    return false
  }

  if (!(yield Effects.ecVerify(header, sig, pubkey))) {
    // l('Invalid proposer sig')
    return false
  }

  const proposedBlock = yield Effects.getProposedBlock()
  if (proposedBlock.locked) {
    // l(`Still locked: ${toHex(proposedBlock.header)} ${toHex(header)}`)
    return false
  }

  if (!(yield Effects.verifyBlock(header, orderedTxBody))) {
    // l(`Bad block proposed ${toHex(header)}`)
    return false
  }

  yield Effects.saveProposedBlock({
    proposer: pubkey,
    sig: sig,
    header: bin(header),
    ordered_tx_body: orderedTxBody,
  })

  return true
}

function calculateNextValidator(timestamp, validators, config, skip = false) {
  const currentIndex = Math.floor(timestamp / config.blocktime) % config.total_shares
  let searchIndex = 0

  for (let i = 0; i < validators.length; i++) {
    const current = validators[i]
    searchIndex += current.shares

    if (searchIndex <= currentIndex) continue
    if (!skip) return current

    // go back to 0
    if (currentIndex + 1 == config.total_shares) return validators[0]

    // same validator
    if (currentIndex + 1 < searchIndex) return current

    // next validator
    return validators[i + 1]
  }
}
