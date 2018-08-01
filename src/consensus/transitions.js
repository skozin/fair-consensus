const Effects = require('../effects')
const {State, MessageType} = require('./constants')

function* awiatToProposeTransition(state) {
  // console.log('awiatToProposeTransition')

  state.step = State.PROPOSE
  const proposerId = yield Effects.getProposerId()

  if (state.peerId !== proposerId) {
    // console.log(`You ${state.peerId} are not the current proposer ${proposerId}`)
    return
  }

  const value = state.lockedValue
    ? state.lockedValue
    : yield Effects.getValue()

  // console.log('value', value)

  yield Effects.broadcast({
    type: MessageType.PROPOSE,
    peerId: state.peerId,
    value: value,
  })
}

function* proposeToPrevoteTransition(state) {
  // console.log('proposeToPrevoteTransition')
  state.step = State.PREVOTE

  const prevotable = state.proposedValue
    ? state.proposedValue
    : 0

  yield Effects.broadcast({
    type: MessageType.PREVOTE,
    peerId: state.peerId,
    value: prevotable,
  })
}

function* prevoteToPrecommitTransition(state) {
  // console.log('prevoteToPrecommitTransition')
  state.step = State.PRECOMMIT

  if (yield Effects.achievedQuorum(state.prevotes)) {
    state.lockedValue = state.proposedValue

    yield Effects.broadcast({
      type: MessageType.PRECOMMIT,
      peerId: state.peerId,
      value: state.proposedValue,
    })
  }
}

function* precommitToAwaitTransition(state) {
  // console.log('precommitToAwaitTransition')
  state.step = State.AWAIT
  if (yield Effects.achievedQuorum(state.precommits)) {
    yield Effects.commitValue(state.lockedValue)

    state.lockedValue = null
    state.proposedValue = null
    state.prevotes = {}
    state.precommits = {}

    state.h += 1
  }
}

exports.awiatToProposeTransition = awiatToProposeTransition
exports.proposeToPrevoteTransition = proposeToPrevoteTransition
exports.prevoteToPrecommitTransition = prevoteToPrecommitTransition
exports.precommitToAwaitTransition = precommitToAwaitTransition
