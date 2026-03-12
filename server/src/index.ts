import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger';
import { initDb, databasePath, isPersistent } from './database';
import path from 'path';

import eventRoutes from './routes/events.routes';
import memberRoutes from './routes/members.routes';
import attendanceRoutes from './routes/attendance.routes';
import activityRoutes from './routes/activity.routes';
import authRoutes from './routes/auth.routes';
import locationRoutes from './routes/location.routes';
import messageRoutes from './routes/messages.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.set('etag', false);

// Middleware
app.use(cors());
app.use(express.json());

// Disable caching for API — prevents 304 conditional requests and browser cache
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Swagger docs — available at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Shark-In API Docs',
}));
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});
app.use(
  '/uploads',
  express.static(path.join(__dirname, '../uploads'), {
    maxAge: '7d',
  }),
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/messages', messageRoutes);

// Health check (includes DB mode so you can verify persistent disk is used)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Shark-in API is running',
    database: isPersistent ? 'persistent' : 'ephemeral',
    databasePath: isPersistent ? databasePath : undefined,
  });
});

// Initialize DB then start server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Database: ${databasePath} (${isPersistent ? 'persistent' : 'ephemeral — data is lost on redeploy'})`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
