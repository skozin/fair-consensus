const Effects = require('./effects')

const State = {
  PROPOSE: 'propose',
  PREVOTE: 'prevote',
  PRECOMMIT: 'precommit',
  AWAIT: 'await',
}

const handlers = {
  'PROPOSE': handlePropose,
  'PREVOTE': handlePrevote,
  'PRECOMMIT': handlePrecommit,
}

function calcualteStep(timestamp, config) {
  const second = timestamp % config.blocktime
  if (second < config.stepLatency) {
    return State.PROPOSE
  } else if (second < config.stepLatency * 2) {
    return State.PREVOTE
  } else if (second < config.stepLatency * 3) {
    return State.PRECOMMIT
  } else {
    return State.AWAIT
  }
}

function* consensus(config) {
  let state = {
    peerId: config.peerId,
    h: 0,
    step: State.AWAIT,
    lockedValue: null,
    proposedValue: null,
    prevotes: {},
    precommits: {},
  }

  while(true) {
    const nextMessages = yield Effects.getNextMessages()

    for (const message of nextMessages) {
      if (message && message.type) {
        yield* handlers[message.type](state, message)
      } else {
        throw new Error(
          `message expected to be an object with field type, but recived ${JSON.stringify(message)}`
        )
      }
    }

    const nextStep = calcualteStep(yield Effects.getTimestamp(), config)

    if (state.step == State.AWAIT && nextStep == State.PROPOSE) {
      yield* awiatToProposeTransition(state)
    } else if (state.step == State.PROPOSE && nextStep == State.PREVOTE) {
      yield* proposeToPrevoteTransition(state)
    } else if (state.step == State.PREVOTE && nextStep == State.PRECOMMIT) {
      yield* prevoteToPrecommitTransition(state)
    } else if (state.step == State.PRECOMMIT && nextStep == State.AWAIT) {
      yield* precommitToAwaitTransition(state)
    }

    yield Effects.sleep(13)
  }
}

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
    type: 'PROPOSE',
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
    type: 'PREVOTE',
    peerId: state.peerId,
    value: prevotable,
  })
}

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

function* prevoteToPrecommitTransition(state) {
  // console.log('prevoteToPrecommitTransition')
  state.step = State.PRECOMMIT

  if (yield Effects.achievedQuorum(state.prevotes)) {
    state.lockedValue = state.proposedValue

    yield Effects.broadcast({
      type: 'PRECOMMIT',
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

exports.consensus = consensus
