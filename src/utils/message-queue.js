// This is an util to emulate broadcasting between consensus coroutines.
// Peer also recives his broadcasted message.
// See example in message-queue.test.js

function constructAcks(array) {
  return array.reduce((obj, item) => {
    obj[item] = false
    return obj
  }, {})
}

function eqSet(as, bs) {
  return as.size === bs.size && all(isIn(bs), as)
}

function all(pred, as) {
  for (var a of as) if (!pred(a)) return false
  return true
}

function isIn(as) {
  return function(a) {
    return as.has(a)
  }
}

class MessageQueue {
  constructor(peerIds) {
    this._idsQueue = []
    this._messages = {}
    this._peerIds = peerIds
    this._lastMessageId = 0
  }

  enqueue(peerId, msg) {
    //TODO: don't send a message to myself

    const messageId = this._lastMessageId++

    this._idsQueue.push(messageId)
    this._messages[messageId] = {
      messageId,
      peerId,
      payload: msg,
      acks: constructAcks(this._peerIds)
    }
  }

  dequeue(peerId) {
    const messages = this._idsQueue
      .filter(msgId => !this._messages[msgId].acks[peerId])
      .map(msgId => this._messages[msgId])

    messages.forEach(m => {
      this._messages[m.messageId].acks[peerId] = true
    })

    let i = 0
    for (; i < this._idsQueue.length; ++i) {
      const messageId = this._idsQueue[i]
      const recivedAllAcknowledgments = eqSet(
        new Set(
          Object.keys(this._messages[messageId].acks).filter(
            a => !!this._messages[messageId].acks[a]
          )
        ),
        new Set(this._peerIds)
      )

      if (recivedAllAcknowledgments) {
        this._idsQueue.splice(i--, 1)
        delete this._messages[messageId]
      }
    }

    return messages.map(m => m.payload)
  }
}

exports.MessageQueue = MessageQueue
