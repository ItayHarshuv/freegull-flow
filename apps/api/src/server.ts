import { serve } from '@hono/node-server';
import app from './app';

serve(
  {
    fetch: app.fetch,
    port: 4001,
  },
  (info) => {
    console.log(`New API scaffold listening on http://localhost:${info.port}`);
  }
);
