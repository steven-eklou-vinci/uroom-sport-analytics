import 'dotenv/config';
import { assistantChatFlow } from './assistantFlow.js';

const question = process.argv.slice(2).join(' ') || 'Hello, can you help me?';

const result = await assistantChatFlow({
  question,
  role: 'scout',
  locale: 'en'
});

console.log(JSON.stringify(result, null, 2));
