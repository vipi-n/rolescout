import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships a product dashboard without starter metadata", async () => {
  const [page, layout, dashboard] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/JobDashboard.tsx", root), "utf8"),
  ]);

  assert.match(page, /RoleScout/);
  assert.match(layout, /Curated LinkedIn job alerts/);
  assert.match(layout, /prefers-color-scheme: dark/);
  assert.match(dashboard, /The right roles/);
  assert.match(dashboard, /View on/);
  assert.match(dashboard, /Choose job track/);
  assert.match(dashboard, /selectedTrack/);
  assert.match(dashboard, /rolescout-theme/);
  assert.match(dashboard, /Switch to/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|Starter Project/);
});

test("keeps scheduling, matching, and recipient delivery configurable", async () => {
  const [config, workflow, fetcher, sender] = await Promise.all([
    readFile(new URL("config/digest.config.json", root), "utf8"),
    readFile(new URL(".github/workflows/jobs-digest.yml", root), "utf8"),
    readFile(new URL("scripts/fetch-jobs.mjs", root), "utf8"),
    readFile(new URL("scripts/send-digest.mjs", root), "utf8"),
  ]);

  assert.match(config, /"09:00"/);
  assert.match(config, /"21:00"/);
  assert.match(config, /"maxJobsPerRun": 50/);
  assert.match(config, /"id": "tech"/);
  assert.match(config, /"id": "non-tech"/);
  assert.match(config, /"Senior Backend Engineer"/);
  assert.match(config, /"min": 8/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /deploy-pages/);
  assert.match(fetcher, /linkedin\.com\/jobs-guest/);
  assert.match(fetcher, /trackLabel/);
  assert.match(fetcher, /searchProfiles/);
  assert.match(sender, /nodemailer/);
  assert.match(sender, /service:\s*"gmail"/);
  assert.match(sender, /GMAIL_APP_PASSWORD/);
  assert.match(sender, /DIGEST_RECIPIENTS/);
  assert.match(sender, /topByTrack/);
});
