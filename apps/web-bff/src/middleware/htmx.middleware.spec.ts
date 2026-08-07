import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';

import { htmxMiddleware } from './htmx.middleware';

function invoke(headers: Record<string, string>): { req: Request; next: NextFunction } {
  const req = { headers } as unknown as Request;
  const res = {} as Response;
  const next = vi.fn();

  htmxMiddleware(req, res, next);

  return { req, next };
}

describe('htmxMiddleware', () => {
  it('sets isHtmx to true when the hx-request header is "true"', () => {
    const { req } = invoke({ 'hx-request': 'true' });

    expect(req.isHtmx).toBe(true);
  });

  it('sets isHtmx to false when the hx-request header is absent', () => {
    const { req } = invoke({});

    expect(req.isHtmx).toBe(false);
  });

  it('sets isHtmx to false when the hx-request header is not exactly "true"', () => {
    const { req } = invoke({ 'hx-request': 'false' });

    expect(req.isHtmx).toBe(false);
  });

  it('always calls next()', () => {
    const withHeader = invoke({ 'hx-request': 'true' });
    const withoutHeader = invoke({});

    expect(withHeader.next).toHaveBeenCalledTimes(1);
    expect(withoutHeader.next).toHaveBeenCalledTimes(1);
  });
});
