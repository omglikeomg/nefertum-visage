import express, {
  type Application,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';

import {
  ERROR_FALLBACK,
  NOT_FOUND_FALLBACK,
  PUBLIC_DIR,
  renderOrFallback,
  setupNunjucks,
} from './config/nunjucks.config';
import { htmxMiddleware } from './middleware/htmx.middleware';
import { createFragranceRouter } from './routes/fragrance.router';
import { createIndexRouter } from './routes/index.router';
import { createUserRouter } from './routes/user.router';
import { MockDataService } from './services/mock-data.service';

export function createApp(): Application {
  const app = express();
  const mockData = new MockDataService();

  app.use(helmet());
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  app.set('view engine', 'njk');
  setupNunjucks(app);

  app.use('/static', express.static(PUBLIC_DIR));

  // Before the routers so req.isHtmx is set by the time a handler reads it.
  app.use(htmxMiddleware);

  app.use('/', createIndexRouter(mockData));
  app.use('/fragrance', createFragranceRouter(mockData));
  app.use('/user', createUserRouter(mockData));

  app.use((req: Request, res: Response) => {
    renderOrFallback(res, 404, 'pages/404.njk', { title: 'Not found' }, NOT_FOUND_FALLBACK);
  });

  app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('[web-bff] error:', err);
    renderOrFallback(res, 500, 'pages/error.njk', { title: 'Error' }, ERROR_FALLBACK);
  });

  return app;
}
