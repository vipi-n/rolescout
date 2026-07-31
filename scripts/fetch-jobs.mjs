import { writeFile } from "node:fs/promises";
import { readJson, rootUrl, stripHtml } from "./lib.mjs";

const config = await readJson("config/digest.config.json");
const currentFeed = await readJson("data/jobs.json");
const now = new Date().toISOString();
const SEARCH_DELAY_MS = 700;

const headers = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
  accept: "text/html,application/xhtml+xml",
  "accept-language": "en-US,en;q=0.9",
};

function capture(html, className, tag = "[a-z0-9]+") {
  const regex = new RegExp(
    `<${tag}[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  return stripHtml(regex.exec(html)?.[1] ?? "");
}

function captureAttribute(html, className, attribute) {
  const regex = new RegExp(
    `<[^>]*class="[^"]*${className}[^"]*"[^>]*${attribute}="([^"]+)"`,
    "i",
  );
  return (regex.exec(html)?.[1] ?? "").replaceAll("&amp;", "&");
}

function splitCards(html) {
  return html
    .split(/(?=<div[^>]+class="[^"]*base-card)/i)
    .slice(1)
    .map((part) => part.slice(0, 16_000));
}

function workplaceFor(text) {
  if (/\bremote\b/i.test(text)) return "Remote";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  return "On-site";
}

function yearsFrom(text) {
  const range = text.match(
    /(?:minimum\s+of\s+)?(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\s*\+?\s*years?/i,
  );
  if (range) return `${range[1]}–${range[2]} years`;
  const single = text.match(/(\d{1,2})\s*\+?\s*years?(?:\s+of)?\s+experience/i);
  if (single) return `${single[1]}+ years`;
  return "Not specified";
}

function matchedSkills(text, profile) {
  const haystack = text.toLowerCase();
  const found = profile.skills.filter((skill) =>
    haystack.includes(skill.toLowerCase()),
  );
  return found.length ? found : profile.skills.slice(0, 3);
}

function linkedInExperienceLevels(profile) {
  const { min, max } = profile.experienceYears;
  const levels = [];
  if (min <= 1) levels.push("1", "2");
  if (min <= 4 && max >= 2) levels.push("3");
  if (max >= 4) levels.push("4");
  if (max >= 8) levels.push("5");
  return [...new Set(levels)].join(",");
}

function matchesExperience(job, profile) {
  const { min, max } = profile.experienceYears;
  if (min >= 3 && /internship|entry level/i.test(job.experience)) return false;
  if (max < 10 && /executive/i.test(job.experience)) return false;
  const range = job.experience.match(/(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?/);
  if (!range) return true;
  const jobMin = Number(range[1]);
  const jobMax = Number(range[2] ?? range[1]);
  return jobMin <= max && jobMax >= min;
}

function matchScore(job, profile) {
  const text = `${job.title} ${job.description} ${job.skills.join(" ")}`.toLowerCase();
  const roleHits = profile.roles.filter((role) =>
    text.includes(role.toLowerCase()),
  ).length;
  const skillHits = profile.skills.filter((skill) =>
    text.includes(skill.toLowerCase()),
  ).length;
  const locationHit = profile.locations.some((location) =>
    job.location.toLowerCase().includes(location.toLowerCase().split(" ")[0]),
  );
  return Math.min(
    99,
    68 + roleHits * 9 + skillHits * 4 + (locationHit ? 6 : 0),
  );
}

async function fetchDetail(job, profile) {
  try {
    const response = await fetch(
      `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${job.id}`,
      { headers },
    );
    if (!response.ok) return job;
    const html = await response.text();
    const description =
      capture(html, "show-more-less-html__markup", "div") || job.description;
    const criteria = {};
    for (const item of html.match(
      /<li[^>]*description__job-criteria-item[\s\S]*?<\/li>/gi,
    ) ?? []) {
      const label = capture(item, "description__job-criteria-subheader", "h3");
      const value = capture(item, "description__job-criteria-text", "span");
      if (label && value) criteria[label.toLowerCase()] = value;
    }
    const fullText = `${job.title} ${job.location} ${description}`;
    return {
      ...job,
      description: description.slice(0, 680),
      experience:
        criteria["seniority level"] &&
        criteria["seniority level"].toLowerCase() !== "not applicable"
          ? criteria["seniority level"]
          : yearsFrom(description),
      employmentType: criteria["employment type"] || "Full-time",
      workplace: workplaceFor(fullText),
      skills: matchedSkills(fullText, profile),
    };
  } catch {
    return job;
  }
}

async function searchProfile(profile, role, location) {
  const keywords = role;
  const params = new URLSearchParams({
    keywords,
    location,
    sortBy: "DD",
    f_TPR: "r604800",
    f_E: linkedInExperienceLevels(profile),
    start: "0",
  });
  const response = await fetch(
    `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`LinkedIn search returned ${response.status}.`);
  }
  const html = await response.text();
  return splitCards(html)
    .map((card) => {
      const urn = /urn:li:jobPosting:(\d+)/.exec(card)?.[1];
      const url =
        captureAttribute(card, "base-card__full-link", "href") ||
        (urn ? `https://www.linkedin.com/jobs/view/${urn}` : "");
      const postedAt =
        /<time[^>]*datetime="([^"]+)"/i.exec(card)?.[1] ?? now;
      const title = capture(card, "base-search-card__title", "h3");
      const company = capture(card, "base-search-card__subtitle", "h4");
      const jobLocation = capture(card, "job-search-card__location", "span");
      if (!urn || !title || !company) return null;
      return {
        id: urn,
        title,
        company,
        location: jobLocation || location,
        experience: "Not specified",
        employmentType: "Full-time",
        workplace: workplaceFor(`${title} ${jobLocation}`),
        postedAt: new Date(postedAt).toISOString(),
        description: `${title} opportunity at ${company}. Open the source listing for the complete description.`,
        skills: matchedSkills(`${title} ${keywords}`, profile),
        source: "LinkedIn",
        url: url.split("?")[0],
        matchScore: 0,
        firstSeenAt: now,
        track: profile.id,
        trackLabel: profile.label,
      };
    })
    .filter(Boolean);
}

const maxJobsPerProfile = Math.ceil(
  config.maxJobsPerRun / config.searchProfiles.length,
);
const fetchedByProfile = [];

for (const profile of config.searchProfiles) {
  const unique = new Map();
  const searches = profile.roles.flatMap((role) =>
    profile.locations.map((location) => [role, location]),
  );

  for (const [role, location] of searches) {
    try {
      for (const job of await searchProfile(profile, role, location)) {
        unique.set(job.id, job);
      }
    } catch (error) {
      console.warn(`${profile.label}: ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, SEARCH_DELAY_MS));
  }

  let fetched = [...unique.values()].slice(0, maxJobsPerProfile * 2);
  if (fetched.length) {
    fetched = await Promise.all(
      fetched.map((job) => fetchDetail(job, profile)),
    );
  }

  fetchedByProfile.push(
    ...fetched
      .map((job) => ({
        ...job,
        firstSeenAt:
          currentFeed.jobs.find(
            (previous) =>
              previous.id === job.id &&
              (previous.track ?? config.searchProfiles[0].id) === profile.id,
          )?.firstSeenAt ?? now,
        matchScore: matchScore(job, profile),
      }))
      .filter((job) => matchesExperience(job, profile))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxJobsPerProfile),
  );
}

const availableTracks = new Set(fetchedByProfile.map((job) => job.track));
const fallbackJobs = currentFeed.jobs
  .map((job) => ({
    ...job,
    track: job.track ?? config.searchProfiles[0].id,
    trackLabel: job.trackLabel ?? config.searchProfiles[0].label,
  }))
  .filter((job) => !availableTracks.has(job.track));
const jobs = [...fetchedByProfile, ...fallbackJobs]
  .sort((a, b) => b.matchScore - a.matchScore)
  .slice(0, config.maxJobsPerRun);

await writeFile(
  new URL("data/jobs.json", rootUrl),
  `${JSON.stringify({ generatedAt: now, jobs }, null, 2)}\n`,
);

console.log(
  fetchedByProfile.length
    ? `Saved ${jobs.length} LinkedIn matches (${config.searchProfiles
        .map(
          (profile) =>
            `${jobs.filter((job) => job.track === profile.id).length} ${profile.label}`,
        )
        .join(", ")}).`
    : "LinkedIn returned no readable matches; retained the previous feed.",
);
