import OpenAI from 'openai';
import { z } from 'zod';
import { config } from '../config.js';
import type { LeadEmail } from '../gmail/fetchLeadEmails.js';
import { QUALIFICATION_RUBRIC } from './criteria.js';

const LeadExtractionSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email().or(z.literal('')),
  company: z.string(),
  phone: z.string(),
  budget: z.string(),
  timeline: z.string(),
  productInterest: z.string(),
});

const QualificationSchema = z.object({
  score: z.number().int().min(1).max(10),
  reasoning: z.string(),
  highSignals: z.array(z.string()),
  mediumSignals: z.array(z.string()),
  lowSignals: z.array(z.string()),
  isSpam: z.boolean(),
});

export type ExtractedLead = z.infer<typeof LeadExtractionSchema>;
export type QualificationResult = z.infer<typeof QualificationSchema> & {
  extracted: ExtractedLead;
};

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: config.openaiApiKey() });
}

export async function extractAndQualifyLead(email: LeadEmail): Promise<QualificationResult> {
  const client = getOpenAI();
  const model = config.openaiModel;

  const content = `
From: ${email.sender}
Subject: ${email.subject}
Date: ${email.date}

Body:
${email.body || email.snippet}
`.trim();

  const extractionResponse = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Extract structured lead data from sales inquiry emails. Use sender email when body lacks email. Split name into first/last when possible. Return JSON only.',
      },
      {
        role: 'user',
        content: `Extract fields: firstName, lastName, email, company, phone, budget, timeline, productInterest.\n\n${content}`,
      },
    ],
  });

  const extractionRaw = extractionResponse.choices[0]?.message?.content || '{}';
  let extracted: ExtractedLead;
  try {
    const parsed = JSON.parse(extractionRaw);
    extracted = LeadExtractionSchema.parse({
      ...parsed,
      email: parsed.email || email.senderEmail,
    });
  } catch {
    extracted = {
      firstName: email.senderName.split(' ')[0] || '',
      lastName: email.senderName.split(' ').slice(1).join(' ') || '',
      email: email.senderEmail,
      company: '',
      phone: '',
      budget: '',
      timeline: '',
      productInterest: '',
    };
  }

  const qualifyResponse = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You qualify B2B sales leads. ${QUALIFICATION_RUBRIC}\n\nReturn JSON: score (1-10), reasoning, highSignals[], mediumSignals[], lowSignals[], isSpam (true for obvious spam/marketing noise).`,
      },
      {
        role: 'user',
        content: `Qualify this lead:\n\n${content}\n\nExtracted: ${JSON.stringify(extracted)}`,
      },
    ],
  });

  const qualifyRaw = qualifyResponse.choices[0]?.message?.content || '{}';
  const qualified = QualificationSchema.parse(JSON.parse(qualifyRaw));

  return { ...qualified, extracted };
}
