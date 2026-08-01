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
  assert.match(layout, /Curated job alerts/);
  assert.match(layout, /prefers-color-scheme: dark/);
  assert.match(dashboard, /Roles matched to/);
  assert.match(dashboard, /View on/);
  assert.match(dashboard, /Choose job track/);
  assert.match(dashboard, /selectedTrack/);
  assert.match(dashboard, /rolescout-theme/);
  assert.match(dashboard, /Switch to/);
  assert.match(dashboard, /Copy link/);
  assert.match(dashboard, /rolescout-job-statuses/);
  assert.match(dashboard, /Application status/);
  assert.match(dashboard, /className="brief-detail"/);
  assert.match(dashboard, /<details>/);
  assert.match(dashboard, /TOTAL JOBS/);
  assert.doesNotMatch(dashboard, /JOBS FOUND/);
  assert.doesNotMatch(dashboard, /REMOTE ROLES/);
  assert.doesNotMatch(dashboard, /Filter by location/);
  assert.doesNotMatch(dashboard, /locationOptions/);
  assert.doesNotMatch(dashboard, /Relocation-ready roles by location/);
  assert.doesNotMatch(dashboard, /APPLICATION ASSISTANT/);
  assert.doesNotMatch(dashboard, /LATEST EDITION/);
  assert.doesNotMatch(dashboard, /Twice a day/);
  assert.doesNotMatch(`${page}${layout}`, /codex-preview|Starter Project/);
});

test("ships RoleScout browser and Apple icons", async () => {
  const [icon, appleIcon] = await Promise.all([
    readFile(new URL("app/icon.png", root)),
    readFile(new URL("app/apple-icon.png", root)),
  ]);
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

  assert.deepEqual([...icon.subarray(0, 8)], pngSignature);
  assert.deepEqual([...appleIcon.subarray(0, 8)], pngSignature);
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
  assert.match(config, /"Investment Operations Support"/);
  assert.match(config, /"Portfolio Expense & Fee Tracking"/);
  assert.match(config, /"NAV Calculation"/);
  assert.match(config, /"Fund Accounting"/);
  assert.match(config, /"Fund Accounting Analyst"/);
  assert.match(config, /"Product Control Analyst"/);
  assert.match(config, /"Senior Backend Engineer"/);
  assert.match(config, /"Staff Software Engineer"/);
  assert.match(config, /"Principal Software Engineer"/);
  assert.match(config, /"Apache Spark"/);
  assert.match(config, /"Etcd"/);
  assert.match(config, /"HDFS"/);
  assert.match(config, /"Prometheus"/);
  assert.match(config, /"Grafana"/);
  assert.match(config, /"min": 8/);
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron: "30 3,15 \* \* \*"/);
  assert.match(workflow, /deploy-pages/);
  assert.match(
    workflow,
    /should_run == 'true' \|\| github\.event_name == 'push'/,
  );
  assert.match(fetcher, /linkedin\.com\/jobs-guest/);
  assert.match(fetcher, /trackLabel/);
  assert.match(fetcher, /searchProfiles/);
  assert.match(fetcher, /profile\.skills/);
  assert.match(fetcher, /join\(" OR "\)/);
  assert.match(fetcher, /matchesRoleOrSkills/);
  assert.match(fetcher, /skillHits > 0/);
  assert.match(sender, /nodemailer/);
  assert.match(sender, /service:\s*"gmail"/);
  assert.match(sender, /GMAIL_APP_PASSWORD/);
  assert.match(sender, /DIGEST_RECIPIENTS/);
  assert.match(sender, /topByTrack/);
  assert.match(sender, /process\.exit\(1\)/);
});

test("documents profile and recipient maintenance", async () => {
  const readme = await readFile(new URL("README.md", root), "utf8");

  assert.match(readme, /Change roles, skills, experience, or location/);
  assert.match(readme, /"roles"/);
  assert.match(readme, /experienceYears/);
  assert.match(readme, /Change the email recipients/);
  assert.match(readme, /DIGEST_RECIPIENTS/);
  assert.match(readme, /first\.person@gmail\.com,second\.person@gmail\.com/);
  assert.match(readme, /Applying and tracking/);
  assert.match(readme, /statuses are saved only in your browser/);
});
