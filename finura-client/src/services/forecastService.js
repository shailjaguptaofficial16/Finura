import api from './api';

const forecastService = {
  get: (months = 12) => api.get(`/forecast?months=${months}`),
  planning: (months = 12) => api.get(`/forecast/planning?months=${months}`),
  goals: () => api.get('/forecast/goals'),
  scenario: (payload) => api.post('/forecast/scenario', payload),
};

export default forecastService;
