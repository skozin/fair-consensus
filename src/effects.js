const Effects = {}
module.exports = Effects

Effects.getConfig = () => {
  return {type: Effects.getConfig.type}
}

Effects.getConfig.type = 'getConfig'

Effects.getValidators = () => {
  return {type: Effects.getValidators.type}
}

Effects.getValidators.type = 'getValidators'

Effects.getTimestamp = () => {
  return {type: Effects.getTimestamp.type}
}

Effects.getTimestamp.type = 'getTimestamp'

Effects.getLastBlockTimestamp = () => {
  return {type: Effects.getLastBlockTimestamp.type}
}

Effects.getLastBlockTimestamp.type = 'getLastBlockTimestamp'

Effects.ecVerify = (data, sig, pubkey) => {
  return {type: Effects.ecVerify.type, data, sig, pubkey}
}

Effects.ecVerify.type = 'ecVerify'

Effects.getProposedBlock = () => {
  return {type: Effects.getProposedBlock.type}
}

Effects.getProposedBlock.type = 'getProposedBlock'

Effects.saveProposedBlock = (block) => {
  return {type: Effects.saveProposedBlock.type, block}
}

Effects.saveProposedBlock.type = 'saveProposedBlock'

Effects.verifyBlock = (header, orderedTxBody) => {
  return {type: Effects.verifyBlock.type, header, orderedTxBody}
}

Effects.verifyBlock.type = 'verifyBlock'

////////////////////////////////////////////////////////////////////////////////

Effects.sleep = (ms) => {
  return {type: Effects.sleep.type, ms}
}

Effects.sleep.type = 'sleep'

Effects.proposer = () => {
  return {type: Effects.proposer.type}
}

Effects.proposer.type = 'proposer'

Effects.getValue = () => {
  return {type: Effects.getValue.type}
}

Effects.getValue.type = 'getValue'

Effects.gossip = () => {
  return {type: Effects.gossip.type}
}

Effects.gossip.type = 'gossip'

Effects.getNextMessages = () => {
  return {type: Effects.getNextMessages.type}
}

Effects.getNextMessages.type = 'getNextMessages'

Effects.broadcast = (msg) => {
  return {type: Effects.broadcast.type, msg}
}

Effects.broadcast.type = 'broadcast'

Effects.getProposerId = () => {
  return {type: Effects.getProposerId.type}
}

Effects.getProposerId.type = 'getProposerId'

Effects.achievedQuorum = (votes) => {
  return {type: Effects.achievedQuorum.type, votes}
}

Effects.achievedQuorum.type = 'achievedQuorum'

Effects.commitValue = (value) => {
  return {type: Effects.commitValue.type, value}
}

Effects.commitValue.type = 'commitValue'


Effects.getValue = () => {
  return {type: Effects.getValue.type}
}

Effects.getValue.type = 'getValue'
