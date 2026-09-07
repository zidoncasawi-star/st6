import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { getDb } from './server/db.js';
import authRouter from './server/routes/auth.js';
import adminRouter from './server/routes/admin.js';
import clientRouter from './server/routes/client.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Secret', 'X-Client-Signature', 'X-Hwid', 'X-Timestamp']
  }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Initialize DB & Seed Data
  await getDb();

  // Rate Limiting Simulator / Simple security header middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Gateway-Engine', 'NexusVPN-Core-v1.5');
    next();
  });

  // Health Endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'NexusVPN Control Gateway',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  // REST API Routes
  app.use('/api/v1/admin', authRouter);
  app.use('/api/v1/admin', adminRouter);
  app.use('/api/admin', authRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api/client', clientRouter);
  app.use('/api/v1/client', clientRouter);
  app.use('/api/v1', clientRouter);
  app.use('/api', clientRouter);

  // Vite middleware in development vs Static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[NexusVPN Core Gateway] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[NexusVPN] Failed to start server:', err);
  process.exit(1);
});
