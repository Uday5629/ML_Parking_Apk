import axios from 'axios';

const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:8080';

const axiosInstance = axios.create({
  baseURL: apiBase,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

export default axiosInstance;

