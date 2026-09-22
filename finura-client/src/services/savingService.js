import api from './api';

const savingService = {
  list: () => api.get('/savings'),
  summary: () => api.get('/savings/summary'),
  accounts: () => api.get('/accounts'),
  create: (payload) => api.post('/savings', payload),
  contribute: (payload) => api.post('/savings/contribute', payload),
  update: (id, payload) => api.put(`/savings/${id}`, payload),
  remove: (id) => api.delete(`/savings/${id}`),
};

export default savingService;
