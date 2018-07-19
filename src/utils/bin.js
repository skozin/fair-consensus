module.exports = function bin(data) {
  if (data instanceof ArrayBuffer) {
    //Buffer.from(arrayBuffer: This creates a view of the ArrayBuffer without copying the underlying memory
    //Buffer.from(buffer): Copies the passed buffer data onto a new Buffer instance

    return Buffer.from(Buffer.from(data))
  } else if (data instanceof Buffer) {
    return data
  } else {
    return Buffer.from(typeof data == 'number' ? [data] : data)
  }
}
