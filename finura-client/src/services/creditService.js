import api from './api';
const unwrap = (response) => response.data?.data || response.data;
const creditService = {
  dashboard: () => api.get('/credit/dashboard').then(unwrap),
  overview: () => api.get('/credit/overview').then(unwrap),
  cards: () => api.get('/credit/cards').then(unwrap),
  createCard: (data) => api.post('/credit/cards', data).then(unwrap),
  updateCard: (id, data) => api.patch(`/credit/cards/${id}`, data).then(unwrap),
  closeCard: (id) => api.delete(`/credit/cards/${id}`).then(unwrap),
  loans: () => api.get('/credit/loans').then(unwrap),
  createLoan: (data) => api.post('/credit/loans', data).then(unwrap),
  updateLoan: (id, data) => api.patch(`/credit/loans/${id}`, data).then(unwrap),
  closeLoan: (id) => api.delete(`/credit/loans/${id}`).then(unwrap),
  latestScore: () => api.get('/credit/score/latest').then(unwrap),
  scoreHistory: () => api.get('/credit/score/history').then(unwrap),
  createScore: (data) => api.post('/credit/score', data).then(unwrap),
  deleteScore: (id) => api.delete(`/credit/score/${id}`).then(unwrap),
  applications: () => api.get('/credit/applications').then(unwrap),
  createApplication: (data) => api.post('/credit/applications', data).then(unwrap),
  updateApplicationStatus: (id, status, extra = {}) => api.patch(`/credit/applications/${id}/status`, { status, ...extra }).then(unwrap),
  cancelApplication: (id) => api.delete(`/credit/applications/${id}`).then(unwrap),
};
export default creditService;
