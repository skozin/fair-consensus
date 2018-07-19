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
