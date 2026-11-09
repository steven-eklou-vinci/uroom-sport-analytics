import 'dotenv/config';
import cors from 'cors';
import express from 'express';

import { assistantChatFlow, reportDraftFlow } from './assistantFlow.js';

const app = express();
const port = Number(process.env.PORT ?? '4100');

app.use(cors({ origin: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/assistant/chat', async (req, res) => {
  try {
    const payload = req.body ?? {};

    if (!payload.question || typeof payload.question !== 'string') {
      return res.status(400).json({ error: 'Missing question.' });
    }

    const response = await assistantChatFlow(payload);
    return res.json(response);
  } catch (error) {
    console.warn('assistant/chat failed', error);
    return res.status(500).json({ error: 'Failed to generate response.' });
  }
});

app.post('/assistant/report-draft', async (req, res) => {
  try {
    const response = await reportDraftFlow(req.body ?? {});
    return res.json(response);
  } catch (error) {
    console.warn('assistant/report-draft failed', error);
    return res.status(500).json({ error: 'Failed to generate report draft.' });
  }
});

app.listen(port, () => {
  console.log(`Uroom Genkit server listening on port ${port}.`);
});
