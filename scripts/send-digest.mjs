import nodemailer from "nodemailer";
import { absoluteSiteUrl, escapeHtml, readJson } from "./lib.mjs";

const config = await readJson("config/digest.config.json");
const feed = await readJson("data/jobs.json");
const gmailUser = process.env.GMAIL_USER;
const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
const siteUrl = absoluteSiteUrl(process.env.SITE_URL);
const configuredRecipients = config.recipients.filter(
  (recipient) => !recipient.endsWith("@example.com"),
);
const recipients = (process.env.DIGEST_RECIPIENTS
  ? process.env.DIGEST_RECIPIENTS.split(",")
  : configuredRecipients
)
  .map((recipient) => recipient.trim())
  .filter(Boolean);

if (!gmailUser || !gmailAppPassword || !siteUrl || recipients.length === 0) {
  console.error(
    "Email skipped: configure GMAIL_USER, GMAIL_APP_PASSWORD, SITE_URL, and at least one real recipient.",
  );
  process.exit(1);
}

const fresh = feed.jobs.filter(
  (job) =>
    Date.now() - new Date(job.firstSeenAt).getTime() < 24 * 60 * 60 * 1000,
);
const companies = new Set(feed.jobs.map((job) => job.company)).size;
const remote = feed.jobs.filter(
  (job) => job.workplace.toLowerCase() === "remote",
).length;
const topByTrack = config.searchProfiles.map((profile) => ({
  profile,
  jobs: feed.jobs
    .filter(
      (job) => (job.track ?? config.searchProfiles[0].id) === profile.id,
    )
    .slice(0, 3),
}));

const cards = topByTrack
  .map(
    ({ profile, jobs }) =>
      jobs.length
        ? `
          <tr>
            <td style="padding:22px 0 8px;color:#ee6c3b;font:700 10px Arial,sans-serif;letter-spacing:.12em">
              ${escapeHtml(profile.label.toUpperCase())} · ${profile.experienceYears.min}–${profile.experienceYears.max} YEARS
            </td>
          </tr>
          ${jobs
            .map(
              (job) => `
                <tr>
                  <td style="padding:18px 0;border-top:1px solid #d7d2c6">
                    <div style="color:#ee6c3b;font:700 11px Arial,sans-serif;text-transform:uppercase;letter-spacing:.08em">${escapeHtml(job.company)}</div>
                    <div style="color:#183128;font:600 20px Georgia,serif;margin:5px 0">${escapeHtml(job.title)}</div>
                    <div style="color:#607169;font:12px Arial,sans-serif">${escapeHtml(job.location)} · ${escapeHtml(job.experience)} · ${escapeHtml(job.workplace)}</div>
                    <div style="margin-top:12px"><a href="${siteUrl}/?track=${encodeURIComponent(profile.id)}#job-${encodeURIComponent(job.id)}" style="color:#1d5c45;font:700 12px Arial,sans-serif">See full details →</a></div>
                  </td>
                </tr>`,
            )
            .join("")}`
        : "",
  )
  .join("");

const html = `
<!doctype html>
<html>
  <body style="margin:0;background:#f5f2ea;padding:28px 12px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fffdfa">
          <tr>
            <td style="background:#183128;color:#fff;padding:34px 38px">
              <div style="color:#f18a62;font:700 11px Arial,sans-serif;letter-spacing:.12em">ROLESCOUT · YOUR LATEST EDITION</div>
              <h1 style="font:500 38px Georgia,serif;line-height:1.05;margin:13px 0 8px">The right roles,<br><i>right on time.</i></h1>
              <p style="color:#c4d0cb;font:14px Arial,sans-serif;line-height:1.5;margin:0">Fresh LinkedIn opportunities matched to your search brief.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 38px 8px">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:33%;color:#183128;font:500 28px Georgia,serif">${fresh.length}<div style="color:#607169;font:10px Arial,sans-serif">FRESH MATCHES</div></td>
                  <td style="width:33%;color:#183128;font:500 28px Georgia,serif">${companies}<div style="color:#607169;font:10px Arial,sans-serif">COMPANIES</div></td>
                  <td style="width:33%;color:#183128;font:500 28px Georgia,serif">${remote}<div style="color:#607169;font:10px Arial,sans-serif">REMOTE ROLES</div></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:13px 38px 8px"><div style="color:#ee6c3b;font:700 10px Arial,sans-serif;letter-spacing:.12em">TOP MATCHES</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0">${cards}</table></td></tr>
          <tr>
            <td style="padding:24px 38px 38px">
              <a href="${siteUrl}/" style="display:inline-block;background:#ee6c3b;color:white;text-decoration:none;font:700 13px Arial,sans-serif;padding:14px 20px;border-radius:2px">Explore all ${feed.jobs.length} roles →</a>
              <p style="color:#7c8984;font:10px Arial,sans-serif;line-height:1.5;margin:20px 0 0">You receive this digest because this address is listed in RoleScout’s private configuration. Listings remain with LinkedIn and the original employer.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

const subject = `${fresh.length || feed.jobs.length} roles worth a look · RoleScout`;
const text = [
  "RoleScout — your latest job digest",
  "",
  `${fresh.length} fresh matches from ${companies} companies.`,
  "",
  ...topByTrack.flatMap(({ profile, jobs }) => [
    `${profile.label} (${profile.experienceYears.min}–${profile.experienceYears.max} years)`,
    ...jobs.map(
      (job, index) =>
        `${index + 1}. ${job.title} — ${job.company}\n${job.location} · ${job.experience} · ${job.workplace}\n${siteUrl}/?track=${profile.id}#job-${job.id}`,
    ),
    "",
  ]),
  `Explore all ${feed.jobs.length} roles: ${siteUrl}/`,
].join("\n");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: gmailUser,
    pass: gmailAppPassword.replace(/\s+/g, ""),
  },
});

await transporter.verify();

for (const recipient of recipients) {
  await transporter.sendMail({
    from: `RoleScout <${gmailUser}>`,
    to: recipient,
    replyTo: gmailUser,
    subject,
    text,
    html,
  });
}

console.log(`Sent the digest to ${recipients.length} recipient(s).`);
