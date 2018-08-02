const {runGenerator} = require('../../src/utils/runner')

const State = {
  NEW: 0,
  STARTED: 1,
  SUCCEEDED: 2,
  FAILED: 3,
}

module.exports = class TestRunner {

  constructor(gen, effectHandlersByType = {}, genId = null) {
    this._gen = gen
    this._genId = genId
    this._state = State.NEW
    this._genFinishedFuture = makeFuture()
    this._effectHandlersByType = effectHandlersByType
    this._decoratedEffectHandlersByType = {}
    this._stopOnEffectType = null
    this._waitUntilNEffectsProduced = 0
    this._numEffectsProduced = 0
    this._stoppedOnEffectFuture = null
    this._effectResultFuture = null
  }

  resumeAndRunUntilEffect(stopOnEffectType, resumeWithValue = undefined) {
    this._resume(stopOnEffectType, 1, resumeWithValue)
    return this._stoppedOnEffectFuture.promise
  }

  resumeAndRunUntilNEffectsProduced(stopOnEffectType, n, resumeWithValue = undefined) {
    this._resume(stopOnEffectType, n, resumeWithValue)
    return this._stoppedOnEffectFuture.promise
  }

  resumeAndRunUntilFinish(resumeWithValue = undefined) {
    this._resume(null, null, resumeWithValue)
    return this.finishedPromise()
  }

  finishedPromise() {
    return this._genFinishedFuture.promise
  }

  isStarted() {
    return this._state >= State.STARTED
  }

  isFinished() {
    return this._state >= State.SUCCEEDED
  }

  _resume(stopOnEffectType, waitUntilNEffectsProduced, resumeWithValue) {
    if (this.isFinished()) {
      throw new Error(`cannot resume finished generator`)
    }

    if (this._stopOnEffectType !== null) {
      throw new Error(`cannot wait for two effects at the same time`)
    }

    this._stopOnEffectType = stopOnEffectType
    this._waitUntilNEffectsProduced = waitUntilNEffectsProduced
    this._numEffectsProduced = 0

    if (stopOnEffectType !== null) {
      // console.log(`will stop on effect of type "${stopOnEffectType}"`)
      this._ensureDecoratedEffectHandler(stopOnEffectType)
      this._stoppedOnEffectFuture = makeFuture()
      this._stoppedOnEffectFuture.effectType = stopOnEffectType
    }

    if (!this.isStarted()) {
      if (resumeWithValue !== undefined) {
        throw new Error(`cannot start generator and pass a value at the same time`)
      }
      this._runGenerator()
      return
    }

    if (!this._effectResultFuture) {
      throw new Error(`execution of generator is not paused on effect`)
    }

    // console.log(`resuming with value:`, resumeWithValue)

    this._effectResultFuture.resolve(resumeWithValue)
    this._effectResultFuture = null
  }

  _runGenerator() {
    // console.log(`starting generator`)

    this._state = State.STARTED
    this._populateDecoratedEffectHandlers()

    const promise = runGenerator(this._gen, this._decoratedEffectHandlersByType, this._genId)

    promise.then(result => {
      this._state = State.SUCCEEDED
      this._genFinishedFuture.resolve(result)
      if (this._stoppedOnEffectFuture) {
        this._stoppedOnEffectFuture.reject(new Error(
          `generator finished with result (${result}) without generating ` +
          `the expected effect "${this._stoppedOnEffectFuture.effectType}"`
        ))
      }
    }, nop)

    promise.catch(err => {
      this._state = State.FAILED
      this._genFinishedFuture.reject(err)
      if (this._stoppedOnEffectFuture) {
        this._stoppedOnEffectFuture.reject(err)
      }
    })
  }

  _makeEffectHandler(effectType) {
    return effect => {
      if (
        this._stopOnEffectType === effect.type &&
        ++this._numEffectsProduced === this._waitUntilNEffectsProduced
      ) {
        this._stopOnEffectType = null
        this._effectResultFuture = makeFuture()
        this._stoppedOnEffectFuture.resolve(effect)
        // console.log(`stopped on effect "${effectType}"`)
        return this._effectResultFuture.promise//.then(x => {
          // console.log(`resumed after stopping on effect "${effectType}", value:`, x)
          // return x
        // })
      }
      // console.log(`processing effect with no special handling: "${effectType}"`)
      const handler = this._effectHandlersByType[effectType]
      if (!handler) {
        throw new Error(`no handler for effect with type '${effect.type}'`)
      }
      return handler(effect, this._genId)
    }
  }

  _populateDecoratedEffectHandlers() {
    Object.keys(this._effectHandlersByType).forEach(effectType => {
      this._ensureDecoratedEffectHandler(effectType)
    })
  }

  _ensureDecoratedEffectHandler(effectType) {
    if (!this._decoratedEffectHandlersByType[effectType]) {
      this._decoratedEffectHandlersByType[effectType] = this._makeEffectHandler(effectType)
    }
  }
}

function makeFuture() {
  let resolve, reject
  let promise = new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
  return {promise, resolve, reject}
}

function nop() {}
