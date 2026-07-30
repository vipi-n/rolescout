# RoleScout

RoleScout is a minimal LinkedIn job monitor designed for GitHub Pages. A scheduled GitHub Action searches for roles matching configurable job titles, skills, experience, and locations; refreshes the public detail dashboard; and emails a high-level digest to each recipient with links back to individual jobs.

## What it includes

- LinkedIn guest job search with direct source links
- Role, skill, experience, and location matching
- A static, searchable GitHub Pages dashboard
- Separate emails for each recipient through Gmail SMTP
- A configurable timezone and twice-daily schedule
- A manual “Run workflow” trigger for testing
- Safe fallback to the last generated feed if LinkedIn is temporarily unavailable

## Configure your search

Edit `config/digest.config.json`:

```json
{
  "timezone": "Asia/Kolkata",
  "schedule": ["09:00", "21:00"],
  "recipients": ["you@example.com"],
  "search": {
    "roles": ["FP&A Analyst", "Business Finance Analyst", "Investment Operations Analyst"],
    "skills": ["Financial Planning and Analysis", "Budgeting and Forecasting", "Advanced Excel", "Power BI", "SAP Financial Systems"],
    "locations": ["Bengaluru"],
    "experienceYears": { "min": 4, "max": 6 },
    "maxJobsPerRun": 50
  }
}
```

The scheduler checks the configuration every 30 minutes, so digest times should use `:00` or `:30`. GitHub may start scheduled workflows a few minutes late; the project allows the rest of the matching 30-minute window.

## Deploy on GitHub Pages

1. Push this project to a GitHub repository with `main` as the default branch.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Enable 2-Step Verification on the Gmail account that will send the digest, then create a 16-character Google App Password.
4. Add `GMAIL_USER` as a repository secret containing the sending Gmail address.
5. Add `GMAIL_APP_PASSWORD` as a repository secret containing the App Password.
6. Add `DIGEST_RECIPIENTS` as a secret containing one or two comma-separated addresses. This overrides the public config and keeps recipient addresses private.
6. Open **Actions → Refresh jobs and send digest → Run workflow** for the first test.

Every push deploys the dashboard. Email is sent only for scheduled or manual runs that pass the configured schedule check; manual runs always pass.

## Local use

```bash
npm install
npm run dev
```

To test the production pieces:

```bash
npm run refresh
npm run build:pages
```

The Sites-compatible build remains available through `npm run build`.

## Operational notes

LinkedIn does not offer a general public job-search API. This project uses LinkedIn’s public guest job pages at a low twice-daily frequency and does not bypass authentication. Markup or access rules can change, so the fetcher is intentionally isolated in `scripts/fetch-jobs.mjs`. Before production use, review LinkedIn’s current terms and replace that module with an approved data provider if your organization requires one.

GitHub Pages is public. Job data is appropriate for that surface, but keep recipient addresses and the Gmail App Password in GitHub Secrets rather than committing them.
