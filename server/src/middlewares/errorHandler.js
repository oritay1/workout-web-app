// `code` is a stable identifier (e.g. 'NOT_FOUND') that the client translates.
// `details` adds context to the response, e.g. { field: 'heightCm' }
export class HttpError extends Error {
  constructor(status, code, details = {}) {
    super(code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(req, res, next) {
  next(new HttpError(404, 'NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: 'INVALID_JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ code: 'PAYLOAD_TOO_LARGE' });
  }

  const status = err.status || 500;
  if (status === 500) {
    console.error(err);
    return res.status(500).json({ code: 'SERVER_ERROR' });
  }
  res.status(status).json({ code: err.code, ...err.details });
}
