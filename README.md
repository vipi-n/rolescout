# RoleScout

RoleScout finds LinkedIn jobs, publishes them on GitHub Pages, and emails a digest.

**Live site:** [https://vipi-n.github.io/rolescout/](https://vipi-n.github.io/rolescout/)

## Features

- Tech and Non-tech job profiles
- Role, skill, experience, and location matching
- Searchable dashboard with light/dark mode
- Gmail digests for multiple recipients
- Runs at 9 AM, 9 PM, on every commit, and manually

## Change roles, skills, experience, or location

Edit `config/digest.config.json`.

```json
{
  "maxJobsPerRun": 50,
  "searchProfiles": [
    {
      "id": "tech",
      "label": "Tech",
      "roles": ["Senior Backend Engineer", "Staff Software Engineer"],
      "skills": ["Java", "Spring Boot", "Microservices"],
      "locations": ["Bengaluru"],
      "experienceYears": { "min": 8, "max": 12 }
    }
  ]
}
```

- `roles`: job titles to search
- `skills`: skills used for matching
- `locations`: preferred cities
- `experienceYears`: minimum and maximum experience
- `maxJobsPerRun`: total jobs across all profiles

With two profiles and a limit of 50, each profile receives up to 25 jobs. Keep the JSON valid and upload it back to the same `config` folder.

## Change the email recipients

Go to **GitHub → Settings → Secrets and variables → Actions** and update the `DIGEST_RECIPIENTS` secret.

For two recipients:

```text
first.person@gmail.com,second.person@gmail.com
```

Use commas only—no brackets or quotes. Keep real email addresses in secrets, not in `digest.config.json`.

## Required GitHub secrets

- `GMAIL_USER`: sender Gmail address
- `GMAIL_APP_PASSWORD`: 16-character Google App Password
- `DIGEST_RECIPIENTS`: comma-separated recipient addresses

## When it runs

- Every commit to `main`
- Scheduled at 9 AM and 9 PM
- **Actions → Refresh jobs and send digest → Run workflow**

Each run refreshes jobs, deploys the dashboard, and sends the email.

## Deploy

1. Upload the project to the `main` branch.
2. Under **Settings → Pages**, choose **GitHub Actions**.
3. Add the three required secrets.
4. Run the workflow once manually to test.

## Local use

```bash
npm install
npm run dev
```

LinkedIn access uses public guest job pages, which may change or rate-limit requests. Never commit Gmail passwords, App Passwords, or recipient addresses.
