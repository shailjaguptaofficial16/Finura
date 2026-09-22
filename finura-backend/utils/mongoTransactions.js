const mongoose = require('mongoose');

const supportsMongoTransactions = () => {
  const topologyType = mongoose.connection.getClient()?.topology?.description?.type;
  return ['ReplicaSetWithPrimary', 'ReplicaSetNoPrimary', 'Sharded', 'LoadBalanced'].includes(topologyType);
};

module.exports = { supportsMongoTransactions };