import axios from 'axios'

// Use environment variable or default to backend port 5001
export const API_BASE_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5001'

const getGuestSessionId = () => {
  const existing = sessionStorage.getItem('guestSessionId')
  if (existing) return existing

  const sessionId = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`
  sessionStorage.setItem('guestSessionId', sessionId)
  return sessionId
}

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
})

API.interceptors.request.use((config) => {
  config.headers['X-Session-ID'] = sessionStorage.getItem('guestSessionId') || getGuestSessionId()

  const token = sessionStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error.config?.url || '')
    const isAuthRequest =
      requestUrl.includes('/api/users/login') ||
      requestUrl.includes('/api/users/register')

    if (error.response?.status === 401 && !isAuthRequest) {
      sessionStorage.removeItem('token')
      sessionStorage.removeItem('user')
      sessionStorage.removeItem('pendingAction')

      if (typeof window !== 'undefined') {
        const redirectPath = window.location.pathname + window.location.search
        window.dispatchEvent(
          new CustomEvent('auth:expired', {
            detail: { redirectPath },
          })
        )
      }
    }
    return Promise.reject(error)
  }
)

export default API
