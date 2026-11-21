import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { getDatabase } from './src/server/db/database.js';
import { runMigrations } from './src/server/db/migrations.js';
import { seedDatabase } from './src/server/db/seed.js';
import { createApiApp } from './src/server/app.js';

async function startServer() {
  const db = getDatabase();
  runMigrations(db);
  seedDatabase(db);

  const app = createApiApp(db);
  const port = Number(process.env.PORT ?? 3000);
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distDir, 'index.html'));
      });
    }
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SmartGrowth AI server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartGrowth AI server:', err);
  process.exit(1);
});
