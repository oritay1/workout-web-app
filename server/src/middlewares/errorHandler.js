// `code` is a stable identifier (e.g. 'NOT_FOUND') that the client translates
export class HttpError extends Error {
  constructor(status, code, message = code) {
    super(message);
    this.status = status;
    this.code = code;
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
  if (status === 500) console.error(err);
  res.status(status).json({ code: status === 500 ? 'SERVER_ERROR' : err.code });
}
