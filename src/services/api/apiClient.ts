import axios from 'axios';

// Agora como o Frontend e a API rodam no mesmo servidor do Render (Single Node Service),
// não precisamos mais sofrer com RENDER_EXTERNAL_URL ou erros de travessia (CORS).
// Apenas pedimos o /api local!
const API_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:3000/api'
  : '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Aumentei o timeout preventivamente
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injeção de Token no futuro
apiClient.interceptors.request.use(
  async (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
