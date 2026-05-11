import { API_BASE_URL, ASSET_BASE_URL } from './api-config'
import { clearStoredCsrfToken, ensureCsrfToken, getStoredCsrfToken } from './csrf'
import { normalizeApiData } from '../media'

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const payload = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (typeof payload === 'object' && payload?.message) ||
      (typeof payload === 'string' && payload) ||
      'Request failed'

    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export async function apiRequest(path, options = {}) {
  const { body, headers, credentials = 'include', _retry = false, ...restOptions } = options
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  const method = String(restOptions.method || 'GET').toUpperCase()
  const requiresCsrfToken = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && path !== '/csrf-token'

  if (requiresCsrfToken && !getStoredCsrfToken()) {
    await ensureCsrfToken()
  }

  const csrfToken = requiresCsrfToken ? getStoredCsrfToken() : ''
  const requestHeaders = {
    ...(!isFormData && body ? { 'Content-Type': 'application/json' } : {}),
    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    ...headers,
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials,
      headers: requestHeaders,
      ...(body ? { body: isFormData ? body : JSON.stringify(body) } : {}),
      ...restOptions,
    })
  } catch (requestError) {
    const error = new Error('Could not reach the backend server')
    error.status = 0
    error.cause = requestError
    throw error
  }

  let payload

  try {
    payload = await parseResponse(response)
  } catch (requestError) {
    if (requiresCsrfToken && requestError?.status === 403 && !_retry) {
      clearStoredCsrfToken()
      await ensureCsrfToken({ forceRefresh: true })

      return apiRequest(path, {
        body,
        headers,
        credentials,
        _retry: true,
        ...restOptions,
      })
    }

    throw requestError
  }

  if (!payload || typeof payload !== 'object' || !payload.data) {
    return payload
  }

  return {
    ...payload,
    data: normalizeApiData(path, payload.data, { assetBaseUrl: ASSET_BASE_URL }),
  }
}
