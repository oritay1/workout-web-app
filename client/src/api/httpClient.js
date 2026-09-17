// Single fetch wrapper. Errors carry the server's stable `code` for translation (t(`errors.${code}`))
export async function request(path, options = {}) {
  // responseType 'text' for non-JSON responses (e.g. the Markdown export)
  const { responseType, ...fetchOptions } = options
  let res
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    })
  } catch {
    throw createError(0, 'NETWORK_ERROR')
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw createError(res.status, data?.code || 'SERVER_ERROR', data?.field)
  }
  if (res.status === 204) return null
  return responseType === 'text' ? res.text() : res.json().catch(() => null)
}

function createError(status, code, field) {
  const error = new Error(code)
  error.status = status
  error.code = code
  // Which input was rejected, for INVALID_FIELD errors
  error.field = field
  return error
}
