// Express Request augmentation (R13). `isHtmx` is populated by
// htmx.middleware (Stage 2) from the `hx-request` header.
import 'express';

declare global {
  namespace Express {
    interface Request {
      isHtmx: boolean;
    }
  }
}

export {};
