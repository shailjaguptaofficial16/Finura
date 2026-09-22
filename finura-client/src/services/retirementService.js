import api from './api';

const retirementService = {
  get: () => api.get('/retirement'),
  create: (payload) => api.post('/retirement', payload),
  update: (payload) => api.put('/retirement', payload),
  remove: () => api.delete('/retirement'),
};

export default retirementService;
