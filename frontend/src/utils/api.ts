import axios from 'axios'

// Centralized Axios instance so we can adjust baseURL, auth, interceptors easily.
// With Vite dev server proxying /api and /admin to the backend, baseURL can stay '/'.
export const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 15000,
})

export default api
