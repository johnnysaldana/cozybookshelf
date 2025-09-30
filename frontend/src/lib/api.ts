/**
 * API utility functions with authentication
 */

const API_KEY = process.env.NEXT_PUBLIC_API_KEY

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

/**
 * Enhanced fetch function that automatically includes API key
 */
export async function apiFetch(url: string, options: FetchOptions = {}) {
  const { skipAuth = false, headers = {}, ...restOptions } = options

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  }

  // Add API key if available and not explicitly skipped
  if (API_KEY && !skipAuth) {
    finalHeaders['X-API-Key'] = API_KEY
  }

  return fetch(url, {
    ...restOptions,
    headers: finalHeaders,
  })
}

/**
 * Helper function for GET requests
 */
export async function apiGet(url: string, skipAuth = false) {
  return apiFetch(url, {
    method: 'GET',
    skipAuth,
  })
}

/**
 * Helper function for POST requests
 */
export async function apiPost(url: string, body: any, skipAuth = false) {
  return apiFetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    skipAuth,
  })
}