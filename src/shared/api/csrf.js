import { API_BASE_URL } from './api-config'

let csrfToken = ''
let csrfTokenPromise = null

async function parseCsrfTokenResponse(response) {
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(payload?.message || 'Could not initialize request security')
    error.status = response.status
    throw error
  }

  const nextToken = String(payload?.data?.csrfToken || '').trim()

  if (!nextToken) {
    const error = new Error('Backend did not return a CSRF token')
    error.status = response.status
    throw error
  }

  return nextToken
}

export function getStoredCsrfToken() {
  return csrfToken
}

export function clearStoredCsrfToken() {
  csrfToken = ''
}

export async function fetchCsrfToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && csrfToken) {
    return csrfToken
  }

  if (!forceRefresh && csrfTokenPromise) {
    return csrfTokenPromise
  }

  csrfTokenPromise = fetch(`${API_BASE_URL}/csrf-token`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  })
    .then(parseCsrfTokenResponse)
    .then((nextToken) => {
      csrfToken = nextToken
      return nextToken
    })
    .finally(() => {
      csrfTokenPromise = null
    })

  return csrfTokenPromise
}

export function ensureCsrfToken(options) {
  return fetchCsrfToken(options)
}
