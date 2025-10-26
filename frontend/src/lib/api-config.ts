import axios from 'axios';

const API_URL = 'http://localhost:8989/api';

const api = axios.create({
  baseURL: API_URL,
});

export default api;
