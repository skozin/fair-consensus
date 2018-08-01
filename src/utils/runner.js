exports.makeRunner = makeRunner
exports.runGenerator = runGenerator

function makeRunner(effectHandlersByType, genId = null) {
  return async gen => runGenerator(gen, effectHandlersByType, genId)
}

async function runGenerator(gen, effectHandlersByType, genId = null) {
  if ('function' === typeof gen) {
    gen = gen()
  }

  let state
  let result = undefined
  let isError = false

  while (true) {
    if (isError) {
      state = gen.throw(result)
    } else {
      state = gen.next(result)
    }
    if (state.done) {
      break
    }
    const effect = state.value
    if (!effect || effect.type == null) {
      throw new Error(`you can only yield effects from a generator, got: ${effect}`)
    }
    const handler = effectHandlersByType[effect.type]
    if (!handler) {
      throw new Error(`no handler for effect with type '${effect.type}'`)
    }
    isError = false
    try {
      result = handler(effect, genId)
      if (isThenable(result)) {
        result = await result
      }
    } catch (err) {
      result = err
      isError = true
    }
  }

  return state.value
}

function isThenable(value) {
  return value instanceof Promise || (
    value &&
    'object' === typeof value &&
    'function' === typeof value.then
  )
}
