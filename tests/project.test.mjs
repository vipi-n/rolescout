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
  assert.match(dashboard, /The right roles/);
  assert.match(dashboard, /View on/);
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
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /deploy-pages/);
  assert.match(fetcher, /linkedin\.com\/jobs-guest/);
  assert.match(sender, /api\.resend\.com\/emails\/batch/);
  assert.match(sender, /DIGEST_RECIPIENTS/);
});
