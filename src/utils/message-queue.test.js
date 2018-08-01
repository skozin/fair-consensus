// Run w/ Jest

const {MessageQueue} = require('./message-queue')

describe('Message queue logic', () => {
  const queue = new MessageQueue(['peer_1', 'peer_2', 'peer_3'])

  it('basic use case', () => {
    const msg1 = { type: 'msg_1' }
    const msg2 = { type: 'msg_2' }
    const msg3 = { type: 'msg_3' }

    queue.enqueue('peer_1', msg1)
    queue.enqueue('peer_1', msg2)

    expect(queue.dequeue('peer_2')).toEqual([msg1, msg2])
    expect(queue.dequeue('peer_2')).toEqual([])
    expect(queue.dequeue('peer_3')).toEqual([msg1, msg2])
    expect(queue.dequeue('peer_3')).toEqual([])

    queue.enqueue('peer_2', msg3)

    expect(queue.dequeue('peer_1')).toEqual([msg1, msg2, msg3])
    expect(queue.dequeue('peer_1')).toEqual([])

    expect(queue.dequeue('peer_2')).toEqual([msg3])
    expect(queue.dequeue('peer_2')).toEqual([])
    expect(queue.dequeue('peer_3')).toEqual([msg3])
    expect(queue.dequeue('peer_3')).toEqual([])
  })
})
