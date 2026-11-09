import express from 'express';
import cors from 'cors';
import playersRouter from './routes/players.js';
import playersCsvRouter from './routes/players-csv.js';
import clubsRouter from './routes/clubs.js';
import authRouter from './routes/auth.js';
import reportsRouter from './routes/reports.js';
import shortlistsRouter from './routes/shortlists.js';
import trialsRouter from './routes/trials.js';
import assessmentsRouter from './routes/assessments.js';
import uploadsRouter from './routes/uploads.js';
import aiRouter from './routes/ai.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.get('/', (req, res) => {
  res.json({ message: 'Bienvenue sur l’API Uroom Sports Analytics !' });
});

app.use('/players', playersRouter);
app.use('/players', playersCsvRouter);
app.use('/clubs', clubsRouter);
app.use('/auth', authRouter);
app.use('/reports', reportsRouter);
app.use('/shortlists', shortlistsRouter);
app.use('/trials', trialsRouter);
app.use('/assessments', assessmentsRouter);
app.use('/uploads', uploadsRouter);
app.use('/ai', aiRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`API Uroom lancée sur http://localhost:${PORT}`);
});
