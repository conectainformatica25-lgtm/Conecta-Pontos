import axios from 'axios';

// Utilizando a variável de ambiente suportada pelo Expo
// Veja o arquivo .env.example
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

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
