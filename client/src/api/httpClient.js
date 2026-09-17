// Single fetch wrapper. Errors carry the server's stable `code` for translation (t(`errors.${code}`))
export async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      credentials: 'same-origin',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
  } catch {
    throw createError(0, 'NETWORK_ERROR')
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw createError(res.status, data?.code || 'SERVER_ERROR')
  }
  return data
}

function createError(status, code) {
  const error = new Error(code)
  error.status = status
  error.code = code
  return error
}
