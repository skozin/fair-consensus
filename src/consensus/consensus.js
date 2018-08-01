const Effects = require('../effects')
const {State, MessageType} = require('./constants')

const {
  awiatToProposeTransition,
  proposeToPrevoteTransition,
  prevoteToPrecommitTransition,
  precommitToAwaitTransition,
} = require('./transitions')

const {
  handlePropose,
  handlePrevote,
  handlePrecommit,
} = require('./handlers')

const handlers = {
  [MessageType.PROPOSE]: handlePropose,
  [MessageType.PREVOTE]: handlePrevote,
  [MessageType.PRECOMMIT]: handlePrecommit,
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

exports.consensus = consensus
