import api from './api';

const cleanParams = (params = {}) => Object.fromEntries(
  Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
);

const unwrap = (response) => ({ success: response.data?.success !== false, data: response.data?.data || response.data });

const analyticsService = {
  getIncomeAnalytics: (params) => api.get('/analytics/income', { params: cleanParams(params) }).then(unwrap),
  getExpenseAnalytics: (params) => api.get('/analytics/expenses', { params: cleanParams(params) }).then(unwrap),
  getCategoryAnalytics: (params) => api.get('/analytics/categories', { params: cleanParams(params) }).then(unwrap),
  getCashFlowAnalytics: (params) => api.get('/analytics/cash-flow', { params: cleanParams(params) }).then(unwrap),
  getTrendAnalytics: (params) => api.get('/analytics/trends', { params: cleanParams(params) }).then(unwrap),
  getReportsAnalytics: (params) => api.get('/analytics/reports', { params: cleanParams(params) }).then(unwrap),
  exportAnalytics: (params) => api.get('/analytics/export', { params: cleanParams(params), responseType: params.format === 'json' ? 'json' : 'blob' }),
};

export default analyticsService;
