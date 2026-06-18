import { config } from './config.js';
import { fetchLeadEmails } from './gmail/fetchLeadEmails.js';
import { upsertQualifiedContact } from './hubspot/contacts.js';
import { extractAndQualifyLead } from './qualify/qualifyLead.js';
import { sendSlackNotification } from './slack/notify.js';

export type PipelineOptions = {
  dryRun?: boolean;
};

export type LeadProcessResult = {
  messageId: string;
  subject: string;
  status: 'qualified' | 'unqualified' | 'skipped' | 'error';
  score?: number;
  reason?: string;
  hubspotUrl?: string;
};

export async function runLeadQualificationPipeline(
  options: PipelineOptions = {}
): Promise<LeadProcessResult[]> {
  const threshold = config.qualificationThreshold;
  const dryRun = options.dryRun ?? false;

  console.log(
    `Fetching lead emails (label: ${config.gmailLeadsLabel}, last ${config.gmailLookbackHours}h)...`
  );

  const emails = await fetchLeadEmails();
  console.log(`Found ${emails.length} message(s) to process.\n`);

  const results: LeadProcessResult[] = [];

  for (const email of emails) {
    const base = { messageId: email.messageId, subject: email.subject };

    try {
      const qualification = await extractAndQualifyLead(email);

      if (qualification.isSpam) {
        console.log(`⊘ Skipped (spam): ${email.subject}`);
        results.push({ ...base, status: 'skipped', reason: 'Marked as spam' });
        continue;
      }

      if (qualification.score < threshold) {
        console.log(
          `○ Unqualified (${qualification.score}/10): ${email.subject} — ${qualification.reasoning.slice(0, 80)}…`
        );
        results.push({
          ...base,
          status: 'unqualified',
          score: qualification.score,
          reason: qualification.reasoning,
        });
        continue;
      }

      console.log(`✓ Qualified (${qualification.score}/10): ${email.subject}`);

      if (dryRun) {
        results.push({
          ...base,
          status: 'qualified',
          score: qualification.score,
          reason: `[dry-run] ${qualification.reasoning}`,
        });
        continue;
      }

      const hubspot = await upsertQualifiedContact(qualification.extracted, qualification);
      await sendSlackNotification(email, qualification.extracted, qualification, hubspot);

      console.log(`  → HubSpot ${hubspot.isNew ? 'created' : 'found'}: ${hubspot.url}`);
      console.log(`  → Slack notified (${config.slackChannel})`);

      results.push({
        ...base,
        status: 'qualified',
        score: qualification.score,
        hubspotUrl: hubspot.url,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`✗ Error processing "${email.subject}": ${message}`);
      results.push({ ...base, status: 'error', reason: message });
    }
  }

  return results;
}
