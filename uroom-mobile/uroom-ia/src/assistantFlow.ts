import { googleAI } from '@genkit-ai/google-genai';
import { genkit, z } from 'genkit';

const ai = genkit({
  plugins: [googleAI()],
  model: googleAI.model('gemini-2.5-flash', {
    temperature: 0.4
  })
});

const ChatInputSchema = z
  .object({
    question: z.string(),
    role: z.string().optional(),
    locale: z.string().optional().nullable(),
    appContext: z.string().optional()
  })
  .passthrough();

const ChatOutputSchema = z.object({
  answer: z.string(),
  category: z.enum(['football', 'app-help', 'mixed', 'general']),
  followUpQuestion: z.string().optional()
});

const ReportInputSchema = z
  .object({
    role: z.string().optional(),
    locale: z.string().optional().nullable(),
    player: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
        position: z.string().optional(),
        nationality: z.string().optional(),
        club: z.string().optional(),
        uroomScore: z.number().optional()
      })
      .partial()
      .passthrough()
      .optional(),
    observation: z
      .object({
        liveSessionsCount: z.number().optional(),
        totalObservationSeconds: z.number().optional()
      })
      .partial()
      .passthrough()
      .optional(),
    liveDetections: z.array(z.any()).optional(),
    scoutNotes: z.array(z.any()).optional()
  })
  .passthrough();

const ReportOutputSchema = z.object({
  summary: z.string(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  clubFit: z.array(z.string())
});

type LanguageCode = 'fr' | 'en' | 'nl';

function getLanguage(locale?: string | null): LanguageCode {
  if (!locale) return 'fr';

  const normalized = locale.toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('nl')) return 'nl';
  return 'fr';
}

function languageInstruction(lang: LanguageCode): string {
  switch (lang) {
    case 'en':
      return 'Answer in English only.';
    case 'nl':
      return 'Answer in Dutch only.';
    default:
      return 'Reponds en francais uniquement.';
  }
}

function domainInstruction(lang: LanguageCode): string {
  switch (lang) {
    case 'en':
      return [
        'You are the Uroom AI agent.',
        'Only answer questions about Uroom Sports Analytics or football and sports.',
        'If the question is outside this scope, politely refuse and suggest a relevant topic.'
      ].join(' ');
    case 'nl':
      return [
        'Je bent de Uroom AI agent.',
        'Beantwoord alleen vragen over Uroom Sports Analytics of voetbal en sport.',
        'Als de vraag buiten dit domein valt, weiger beleefd en stel een relevant onderwerp voor.'
      ].join(' ');
    default:
      return [
        'Tu es Uroom IA agent.',
        'Reponds uniquement aux questions sur Uroom Sports Analytics ou le foot et le sport.',
        'Si la question est hors sujet, refuse poliment et propose un sujet pertinent.'
      ].join(' ');
  }
}

export const assistantChatFlow = ai.defineFlow(
  {
    name: 'assistantChatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema
  },
  async (input) => {
    const lang = getLanguage(input.locale);

    const prompt = [
      domainInstruction(lang),
      languageInstruction(lang),
      `Role: ${input.role ?? 'unknown'}`,
      `App context: ${input.appContext ?? 'mobile'}`,
      'Return a concise answer. If helpful, ask one short follow-up question.',
      `User question: ${input.question}`
    ].join('\n');

    const { output } = await ai.generate({
      prompt,
      output: { schema: ChatOutputSchema }
    });

    if (!output) {
      throw new Error('No output generated for assistant chat flow.');
    }

    return output;
  }
);

export const reportDraftFlow = ai.defineFlow(
  {
    name: 'reportDraftFlow',
    inputSchema: ReportInputSchema,
    outputSchema: ReportOutputSchema
  },
  async (input) => {
    const liveDetections = (input.liveDetections ?? []).slice(0, 12);
    const scoutNotes = (input.scoutNotes ?? []).slice(0, 12);

    const lang = getLanguage(input.locale);

    const prompt = [
      'You are the Uroom AI assistant that drafts scouting reports.',
      languageInstruction(lang),
      'Write a concise summary (2-4 sentences).',
      'Return strengths, weaknesses, and clubFit as short bullet phrases.',
      `Role: ${input.role ?? 'unknown'}`,
      'Player data:',
      JSON.stringify(input.player ?? {}, null, 2),
      'Observation:',
      JSON.stringify(input.observation ?? {}, null, 2),
      'Live detections:',
      JSON.stringify(liveDetections, null, 2),
      'Scout notes:',
      JSON.stringify(scoutNotes, null, 2)
    ].join('\n');

    const { output } = await ai.generate({
      prompt,
      output: { schema: ReportOutputSchema }
    });

    if (!output) {
      throw new Error('No output generated for report draft flow.');
    }

    return output;
  }
);
