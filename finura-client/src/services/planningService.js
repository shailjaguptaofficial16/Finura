import api from './api';

const planningService = {
  overview: () => api.get('/planning/overview'),
};

export default planningService;
