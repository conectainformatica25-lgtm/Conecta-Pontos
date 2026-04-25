import axios from 'axios';

// Utilizando a variável de ambiente suportada pelo Expo
let API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

// No Render, a URL provida via RENDER_EXTERNAL_URL não tem o prefixo /api
if (API_URL && !API_URL.endsWith('/api')) {
  // Evita duplicação caso termine com /
  API_URL = API_URL.replace(/\/$/, '') + '/api';
}

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para injeção de Token no futuro
apiClient.interceptors.request.use(
  async (config) => {
    // const token = await SecureStore.getItemAsync('userToken');
    // if (token) {
    //  config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
