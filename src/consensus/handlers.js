const Effects = require('../effects')
const {State} = require('./constants')

function* handlePropose(state, message) {
  // console.log('handlePropose', state, message)

  if (state.step !== State.PROPOSE) {
    return
  }

  const proposerId = yield Effects.getProposerId()
  if (message.peerId !== proposerId) {
    return
  }

  if (state.lockedValue) {
    return
  }

  // TODO: verify proposeMessage

  // console.log('accept propose', message)
  state.proposedValue = message.value
}

function* handlePrevote(state, message) {
  // console.log('handlePrevote', message)

  if (state.step !== State.PREVOTE) {
    // recived PREVOTE message on wrong step => do nothing
    return
  }

  if (message.value === 0) {
    // voted nil
    return
  }

  if (!state.proposedValue) {
    // there is no proposed value
    return
  }

  if (state.proposedValue !== message.value) {
    // proposed value not equals value from PREVOTE message
    return
  }

  // TODO: verify validator signature

  // console.log('accept prevotes', message)

  state.prevotes[message.peerId] = true
}

function* handlePrecommit(state, message) {
  // console.log('handlePrecommit', message)

  if (state.step !== State.PRECOMMIT) {
    // recived PRECOMMIT message on wrong step => do nothing
    return
  }

  if (message.value === 0) {
    // voted nil
    return
  }

  if (!state.proposedValue) {
    // there is no proposed value
    return
  }

  if (state.proposedValue !== message.value) {
    // proposed value not equals value from PRECOMMIT message
    return
  }

  // TODO: verify validator signature

  // console.log('accept precommit', message)

  state.precommits[message.peerId] = true
}

exports.handlePropose = handlePropose
exports.handlePrevote = handlePrevote
exports.handlePrecommit = handlePrecommit
