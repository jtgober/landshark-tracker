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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

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
