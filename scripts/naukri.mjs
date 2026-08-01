import { createHash } from "node:crypto";
import { stripHtml } from "./lib.mjs";

const SEARCH_URL = "https://www.naukri.com/jobapi/v3/search";

const headers = {
  accept: "application/json",
  appid: "109",
  systemid: "109",
  clientid: "naukri",
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
};

function valueFor(job, type) {
  return (
    job.placeholders?.find(
      (item) => String(item.type).toLowerCase() === type.toLowerCase(),
    )?.label ?? ""
  );
}

function skillsFor(job, profile) {
  const raw = Array.isArray(job.tagsAndSkills)
    ? job.tagsAndSkills
    : String(job.tagsAndSkills ?? "").split(/[,|]/);
  const skills = raw.map((skill) => stripHtml(String(skill))).filter(Boolean);
  if (skills.length) return skills.slice(0, 8);

  const text = `${job.title ?? ""} ${job.jobDescription ?? ""}`.toLowerCase();
  const matches = profile.skills.filter((skill) =>
    text.includes(skill.toLowerCase()),
  );
  return (matches.length ? matches : profile.skills).slice(0, 3);
}

function postedAtFor(job, now) {
  const raw = job.createdDate ?? job.createdAt ?? job.postedAt;
  if (raw) {
    const numeric = Number(raw);
    const parsed = Number.isFinite(numeric)
      ? new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric)
      : new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  const age = String(
    job.footerPlaceholderLabel ?? job.postedDate ?? job.createdDateLabel ?? "",
  );
  const count = Number(/(\d+)\s*(?:day|hour|min)/i.exec(age)?.[1] ?? 0);
  const unit = /hour/i.test(age)
    ? 3_600_000
    : /min/i.test(age)
      ? 60_000
      : 86_400_000;
  return new Date(new Date(now).getTime() - count * unit).toISOString();
}

function workplaceFor(text) {
  if (/\b(?:remote|work from home|wfh)\b/i.test(text)) return "Remote";
  if (/\bhybrid\b/i.test(text)) return "Hybrid";
  return "On-site";
}

function sourceUrlFor(job) {
  const value = job.jdURL ?? job.staticUrl ?? job.jobUrl ?? job.url ?? "";
  if (!value) return "";
  return new URL(String(value).replace(/^\/+/, ""), "https://www.naukri.com/").href;
}

export function parseNaukriResponse(payload, profile, now = new Date().toISOString()) {
  const entries =
    payload.jobDetails ?? payload.jobs ?? payload.data?.jobDetails ?? [];

  return entries
    .map((job) => {
      const title = stripHtml(String(job.title ?? job.jobTitle ?? ""));
      const company = stripHtml(
        String(job.companyName ?? job.companyInfo?.name ?? job.company ?? ""),
      );
      const location = stripHtml(
        String(valueFor(job, "location") || job.location || ""),
      );
      const experience = stripHtml(
        String(valueFor(job, "experience") || job.experienceText || ""),
      );
      const url = sourceUrlFor(job);
      if (!title || !company || !url) return null;

      const rawId =
        job.jobId ??
        job.id ??
        createHash("sha1")
          .update(`${title}|${company}|${location}|${url}`)
          .digest("hex")
          .slice(0, 16);
      const description =
        stripHtml(String(job.jobDescription ?? job.description ?? "")) ||
        `${title} opportunity at ${company}. Open the source listing for the complete description.`;
      const fullText = `${title} ${location} ${description}`;

      return {
        id: `naukri-${rawId}`,
        title,
        company,
        location: location || profile.locations.join(", "),
        experience: experience || "Not specified",
        employmentType: "Full-time",
        workplace: workplaceFor(fullText),
        postedAt: postedAtFor(job, now),
        description: description.slice(0, 680),
        skills: skillsFor(job, profile),
        source: "Naukri",
        url,
        matchScore: 0,
        firstSeenAt: now,
        track: profile.id,
        trackLabel: profile.label,
      };
    })
    .filter(Boolean);
}

export async function searchNaukriProfile(
  profile,
  { fetchImpl = fetch, now = new Date().toISOString(), delayMs = 900 } = {},
) {
  const queries = (profile.naukriQueries ?? profile.roles.slice(0, 2)).slice(
    0,
    3,
  );
  const jobs = new Map();

  for (const [index, keyword] of queries.entries()) {
    const location = profile.locations[0] ?? "Bengaluru";
    const params = new URLSearchParams({
      noOfResults: "20",
      urlType: "search_by_keyword",
      searchType: "adv",
      keyword,
      location,
      experience: String(profile.experienceYears.min),
      pageNo: "1",
      k: keyword,
      l: location,
      src: "jobsearchDesk",
    });
    const response = await fetchImpl(`${SEARCH_URL}?${params}`, {
      headers: {
        ...headers,
        referer: `https://www.naukri.com/${encodeURIComponent(keyword.toLowerCase().replace(/\s+/g, "-"))}-jobs-in-${encodeURIComponent(location.toLowerCase())}`,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => ({}));

    if (
      response.status === 406 &&
      /captcha/i.test(String(payload.message ?? ""))
    ) {
      const error = new Error(
        "Naukri requested CAPTCHA; skipped it without bypassing protection.",
      );
      error.code = "NAUKRI_CAPTCHA";
      throw error;
    }
    if (!response.ok) {
      throw new Error(`Naukri search returned ${response.status}.`);
    }

    for (const job of parseNaukriResponse(payload, profile, now)) {
      jobs.set(job.id, job);
    }
    if (index < queries.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return [...jobs.values()];
}
