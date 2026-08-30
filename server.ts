import express from 'express';
import fs from 'fs';
import path from 'path';
import apiRouter from './server/routes/api.js';
import { db } from './server/db/database.js';
import { runMigrations } from './server/db/migrate.js';
import { SeedService } from './server/services/SeedService.js';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  // Body parser
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint (for Cloud Run startup & liveness probes)
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'Dayflow Intelligent HRMS', timestamp: new Date().toISOString() });
  });

  // REST API Routes
  app.use('/api', apiRouter);

  // Vite Middleware for Development / Static for Production
  const distPath = path.join(process.cwd(), 'dist');
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start HTTP listener immediately so Cloud Run port binding and health check pass without delay
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=========================================`);
    console.log(` Dayflow Intelligent HRMS Server running `);
    console.log(` URL: http://localhost:${PORT}             `);
    console.log(`=========================================`);
  });

  // Initialize and Seed Database asynchronously
  (async () => {
    try {
      if (process.env.DATABASE_URL) {
        await runMigrations();
      }
      await db.init();
      await SeedService.seed();
    } catch (err) {
      console.error('Database initialization / seed error:', err);
    }
  })();
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
});

