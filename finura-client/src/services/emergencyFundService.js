import api from './api';

const emergencyFundService = {
  get: () => api.get('/emergency-fund'),
  create: (payload) => api.post('/emergency-fund', payload),
  update: (payload) => api.put('/emergency-fund', payload),
  remove: () => api.delete('/emergency-fund'),
  contribute: (payload) => api.post('/emergency-fund/contribute', payload),
  withdraw: (payload) => api.post('/emergency-fund/withdraw', payload),
  accounts: () => api.get('/accounts'),
};

export default emergencyFundService;
