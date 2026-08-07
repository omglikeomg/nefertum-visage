import { createApp } from './app';

const app = createApp();
const port = Number(process.env.PORT ?? 3001);

process.on('unhandledRejection', (reason) => {
  console.error('[web-bff] unhandled rejection:', reason);
});

app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`[web-bff] listening on http://localhost:${port}`);
});
