// "axios" is an HTTP client library — it makes it easy to send GET, POST, etc.
// requests and handle the responses. Import it plus the type for its config.
import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Import our ApiResponse wrapper type from types/index.ts.
import type { ApiResponse } from '@/types'


// =============================================================================
// API INSTANCE
// "axios.create()" returns a new Axios instance with default settings baked in.
// Any request made through this instance will automatically use these settings.
// WHY use an instance instead of plain axios?
//   Because we can add interceptors (middleware) and set defaults once here
//   rather than repeating them in every service file.
// =============================================================================
const api = axios.create({

  // "baseURL" is prepended to every request URL.
  // So "api.get('/health')" actually calls "http://localhost:8000/health".
  // The value comes from our next.config.ts environment variable.
  // "process.env.NEXT_PUBLIC_API_URL" is set to the PHP backend URL.
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000',

  // "timeout" is how many milliseconds to wait before giving up.
  // 30 seconds is generous for large downloads, but prevents infinite hangs.
  timeout: 30_000,

  // Default headers sent with every request.
  headers: {
    // Tell the server we are sending JSON.
    'Content-Type': 'application/json',

    // Tell the server we want JSON back.
    'Accept': 'application/json',

    // Custom header so the server knows who is calling it.
    // Useful for logging and for rate-limiting bots.
    'X-Client': 'MediaVault-Frontend/1.0',
  },
})


// =============================================================================
// REQUEST INTERCEPTOR
// Runs BEFORE every request is sent. Used here to attach an auth token if one
// exists. (Auth is optional for this version but the hook is ready for it.)
//
// "use(onFulfilled, onRejected)" — both callbacks are optional.
// =============================================================================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {

    // Try to read an auth token from localStorage.
    // "typeof window !== 'undefined'" guards against running this on the server
    // (Next.js can run code on the server where localStorage doesn't exist).
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('mediavault_token')

      // If a token exists, add it to every request header.
      // "Bearer" is the standard format for JWT tokens.
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    // Always return the config — if you forget this the request will hang!
    return config
  },
  // If building the request itself fails, reject with the error.
  (error) => Promise.reject(error)
)


// =============================================================================
// RESPONSE INTERCEPTOR
// Runs AFTER every response is received (or when a request fails).
// We use it to normalise errors into a consistent format.
// =============================================================================
api.interceptors.response.use(

  // For successful responses (2xx status codes), pass data through unchanged.
  (response) => response,

  // For error responses (4xx, 5xx) or network failures, build a readable message.
  (error: AxiosError<ApiResponse<unknown>>) => {

    // "error.response" exists when the server returned a response (even a 500).
    // "error.request"  exists when the request was made but no response came back.
    // Otherwise it's a client-side setup error.

    if (error.response) {
      // Server responded with an error status.
      // Prefer the message from our API's JSON body; fall back to the HTTP status text.
      const message =
        error.response.data?.message ??
        error.response.statusText ??
        'Server error'

      // Log it in the browser console for debugging.
      console.error(`[API Error] ${error.response.status}: ${message}`)

    } else if (error.request) {
      // Request was made but no response was received.
      // This usually means the PHP server is not running.
      console.error('[API Error] No response from server. Is the backend running?')

    } else {
      // Something went wrong while setting up the request.
      console.error('[API Error] Request setup failed:', error.message)
    }

    // Re-throw the error so the calling code (services) can also handle it.
    return Promise.reject(error)
  }
)


// Export the configured instance.
// All other service files will: import api from '@/services/api'
export default api
