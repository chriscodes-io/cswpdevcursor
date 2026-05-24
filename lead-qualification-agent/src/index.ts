#!/usr/bin/env node
import { runLeadQualificationPipeline } from './pipeline.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  console.log('Lead Qualification Agent\n');

  if (dryRun) {
    console.log('DRY RUN — no HubSpot or Slack writes\n');
  }

  const results = await runLeadQualificationPipeline({ dryRun });

  const qualified = results.filter((r) => r.status === 'qualified').length;
  const unqualified = results.filter((r) => r.status === 'unqualified').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errors = results.filter((r) => r.status === 'error').length;

  console.log('\n--- Summary ---');
  console.log(`Qualified:   ${qualified}`);
  console.log(`Unqualified: ${unqualified}`);
  console.log(`Skipped:     ${skipped}`);
  console.log(`Errors:      ${errors}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
