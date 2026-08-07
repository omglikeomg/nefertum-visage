import type { RequestHandler } from 'express';

// R8 — augments the request with `isHtmx` so route handlers can distinguish a
// full-page navigation from an HTMX partial swap. Response headers are set
// per-route by the handlers, never here.
export const htmxMiddleware: RequestHandler = (req, _res, next) => {
  req.isHtmx = req.headers['hx-request'] === 'true';
  next();
};
