import express from 'express';
import cors from 'cors';
import { env } from '@/config';
import { errorHandler } from '@/middleware/error';
import { notFound } from '@/middleware/notFound';
import authRoutes from '@/routes/auth';
import topicRoutes from '@/routes/topics';
import skillRoutes from '@/routes/skills';
import applicationRoutes from '@/routes/applications';
import favoriteRoutes from '@/routes/favorites';
import userRoutes from '@/routes/users';
import adminRoutes from '@/routes/admin';
import selectionRoutes from '@/routes/selection';
import messageRoutes from '@/routes/messages';

const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/topics', topicRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', selectionRoutes);
app.use('/api/messages', messageRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
