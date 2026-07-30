"use client";

import { useMemo, useState } from "react";

type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  experience: string;
  employmentType: string;
  workplace: string;
  postedAt: string;
  description: string;
  skills: string[];
  source: string;
  url: string;
  matchScore: number;
  firstSeenAt: string;
};

type DigestConfig = {
  brandName: string;
  timezone: string;
  schedule: string[];
  search: {
    roles: string[];
    skills: string[];
    locations: string[];
    experienceYears: { min: number; max: number };
  };
};

const Arrow = () => <span aria-hidden="true">↗</span>;

function formatPosted(value: string) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const diff = Math.max(0, Date.now() - date.getTime());
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function getCompanyMark(company: string) {
  return company
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export function JobDashboard({
  initialJobs,
  config,
}: {
  initialJobs: Job[];
  config: DigestConfig;
}) {
  const [query, setQuery] = useState("");
  const [workplace, setWorkplace] = useState("All");

  const jobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialJobs.filter((job) => {
      const matchesQuery =
        !needle ||
        [job.title, job.company, job.location, job.skills.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      const matchesWorkplace =
        workplace === "All" ||
        job.workplace.toLowerCase() === workplace.toLowerCase();
      return matchesQuery && matchesWorkplace;
    });
  }, [initialJobs, query, workplace]);

  const companies = new Set(initialJobs.map((job) => job.company)).size;
  const remoteCount = initialJobs.filter(
    (job) => job.workplace.toLowerCase() === "remote",
  ).length;
  const freshCount = initialJobs.filter(
    (job) => Date.now() - new Date(job.firstSeenAt).getTime() < 86_400_000,
  ).length;
  const topMatch = Math.max(...initialJobs.map((job) => job.matchScore), 0);
  const schedule = config.schedule
    .map((time) => {
      const [hour, minute] = time.split(":").map(Number);
      const date = new Date(2000, 0, 1, hour, minute);
      return date.toLocaleTimeString("en", {
        hour: "numeric",
        minute: "2-digit",
      });
    })
    .join(" & ");

  return (
    <main>
      <nav className="nav">
        <a className="brand" href="#top" aria-label="RoleScout home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>{config.brandName}</span>
        </a>
        <div className="nav-actions">
          <span className="schedule-pill">
            <span className="live-dot" aria-hidden="true" />
            Next digest at {schedule.split(" & ")[0]}
          </span>
          <a className="nav-link" href="#all-jobs">
            All jobs <Arrow />
          </a>
        </div>
      </nav>

      <section className="hero" id="top">
        <div className="eyebrow">YOUR CURATED OPPORTUNITY FEED</div>
        <div className="hero-grid">
          <div>
            <h1>
              The right roles.
              <br />
              <span>Twice a day.</span>
            </h1>
            <p className="hero-copy">
              LinkedIn opportunities distilled around your skills, experience,
              and preferred locations—without the endless scroll.
            </p>
          </div>
          <aside className="brief-card" aria-label="Current search brief">
            <div className="brief-head">
              <span>YOUR SEARCH BRIEF</span>
              <span className="active-badge">Active</span>
            </div>
            <dl>
              <div>
                <dt>ROLES</dt>
                <dd>{config.search.roles.join(" · ")}</dd>
              </div>
              <div>
                <dt>SKILLS</dt>
                <dd>{config.search.skills.join(" · ")}</dd>
              </div>
              <div className="brief-split">
                <span>
                  <dt>EXPERIENCE</dt>
                  <dd>
                    {config.search.experienceYears.min}–
                    {config.search.experienceYears.max} years
                  </dd>
                </span>
                <span>
                  <dt>LOCATION</dt>
                  <dd>{config.search.locations.join(" · ")}</dd>
                </span>
              </div>
            </dl>
            <p>
              Digests run at {schedule} · {config.timezone}
            </p>
          </aside>
        </div>
      </section>

      <section className="content">
        <div className="snapshot" aria-label="Latest job snapshot">
          <div>
            <span>FRESH MATCHES</span>
            <strong>{freshCount}</strong>
            <small>since the last digest</small>
          </div>
          <div>
            <span>COMPANIES</span>
            <strong>{companies}</strong>
            <small>hiring now</small>
          </div>
          <div>
            <span>REMOTE ROLES</span>
            <strong>{remoteCount}</strong>
            <small>work from anywhere</small>
          </div>
          <div>
            <span>TOP MATCH</span>
            <strong>{topMatch}%</strong>
            <small>based on your brief</small>
          </div>
        </div>

        <div className="section-heading" id="all-jobs">
          <div>
            <span className="section-kicker">LATEST EDITION</span>
            <h2>Roles worth your attention</h2>
          </div>
          <span className="updated">Updated moments ago</span>
        </div>

        <div className="toolbar">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">Search jobs</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search role, company, skill…"
            />
          </label>
          <div className="segmented" aria-label="Filter by workplace">
            {["All", "Remote", "Hybrid", "On-site"].map((value) => (
              <button
                className={workplace === value ? "selected" : ""}
                key={value}
                onClick={() => setWorkplace(value)}
                type="button"
              >
                {value}
              </button>
            ))}
          </div>
        </div>

        <div className="job-list">
          {jobs.map((job, index) => (
            <article className="job-card" id={`job-${job.id}`} key={job.id}>
              <div className="company-mark">{getCompanyMark(job.company)}</div>
              <div className="job-main">
                <div className="job-title-row">
                  <div>
                    <p className="company-name">{job.company}</p>
                    <h3>{job.title}</h3>
                  </div>
                  <span className="match">{job.matchScore}% match</span>
                </div>
                <div className="job-meta">
                  <span>⌖ {job.location}</span>
                  <span>◷ {job.experience}</span>
                  <span>{job.workplace}</span>
                  <span>{job.employmentType}</span>
                </div>
                <p className="description">{job.description}</p>
                <div className="skills">
                  {job.skills.slice(0, 5).map((skill) => (
                    <span key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
              <div className="job-action">
                <span>
                  {formatPosted(job.postedAt)}
                  {index < 3 && <em>New</em>}
                </span>
                <a href={job.url} rel="noreferrer" target="_blank">
                  View on {job.source} <Arrow />
                </a>
              </div>
            </article>
          ))}
          {jobs.length === 0 && (
            <div className="empty-state">
              <strong>No roles match those filters.</strong>
              <span>Try a broader keyword or switch the workplace filter.</span>
            </div>
          )}
        </div>

        <div className="digest-note">
          <span className="note-mark" aria-hidden="true">
            ✦
          </span>
          <div>
            <strong>Your digest does the scanning.</strong>
            <p>
              Each edition highlights the best new matches, then links here for
              the complete details and direct application source.
            </p>
          </div>
          <span>{schedule}</span>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>{config.brandName}</span>
        </a>
        <p>Built for focus. Powered by your search brief.</p>
        <p>Source links remain with their original publishers.</p>
      </footer>
    </main>
  );
}
