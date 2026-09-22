import api from './api';
const aiService = { assistant: (message) => api.post('/ai/assistant', { message }).then((response) => response.data?.data || response.data) };
export default aiService;
