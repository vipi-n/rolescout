# RoleScout

RoleScout is a minimal LinkedIn job monitor designed for GitHub Pages. A scheduled GitHub Action searches for roles matching configurable job titles, skills, experience, and locations; refreshes the public detail dashboard; and emails a high-level digest to each recipient with links back to individual jobs.

**Live site:** [https://vipi-n.github.io/rolescout/](https://vipi-n.github.io/rolescout/)

## What it includes

- LinkedIn guest job search with direct source links
- Separate Tech and Non-tech search profiles with a dashboard switcher
- Light and dark themes with automatic system detection and a saved preference
- Role, skill, experience, and location matching for each profile
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
  "maxJobsPerRun": 50,
  "searchProfiles": [
    {
      "id": "non-tech",
      "label": "Non-tech",
      "roles": ["FP&A Analyst", "Business Finance Analyst", "Investment Operations Analyst"],
      "skills": ["Financial Planning and Analysis", "Budgeting and Forecasting", "Advanced Excel", "Power BI"],
      "locations": ["Bengaluru"],
      "experienceYears": { "min": 4, "max": 6 }
    },
    {
      "id": "tech",
      "label": "Tech",
      "roles": ["Senior Backend Engineer", "Staff Software Engineer", "Staff Backend Engineer", "Senior Software Engineer", "Lead Software Engineer", "Principal Software Engineer", "Java Backend Developer"],
      "skills": ["Java", "Spring Boot", "Microservices", "System Design", "Apache Kafka", "Docker", "Kubernetes"],
      "locations": ["Bengaluru"],
      "experienceYears": { "min": 8, "max": 12 }
    }
  ]
}
```

The included profiles are currently tailored to a 4–6 year finance/operations search and an 8+ year backend engineering search spanning Senior, Staff, Lead, Principal, Java, Platform, and distributed-systems roles. `maxJobsPerRun` is the total cap across both profiles, split evenly so one track does not crowd out the other. Each result is tagged with its profile, and the Tech/Non-tech control changes the jobs, summary figures, and search brief shown on the page.

The scheduler checks the configuration every 30 minutes, so digest times should use `:00` or `:30`. GitHub may start scheduled workflows a few minutes late; the project allows the rest of the matching 30-minute window.

## Deploy on GitHub Pages

1. Push this project to a GitHub repository with `main` as the default branch.
2. Open **Settings → Pages** and choose **GitHub Actions** as the source.
3. Enable 2-Step Verification on the Gmail account that will send the digest, then create a 16-character Google App Password.
4. Add `GMAIL_USER` as a repository secret containing the sending Gmail address.
5. Add `GMAIL_APP_PASSWORD` as a repository secret containing the App Password.
6. Add `DIGEST_RECIPIENTS` as a secret containing one or two comma-separated addresses. This overrides the public config and keeps recipient addresses private.
7. Open **Actions → Refresh jobs and send digest → Run workflow** for the first test.

Every push refreshes the jobs, deploys the dashboard, and sends an email digest. Scheduled runs still send at the configured times, and manual runs send immediately.

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
