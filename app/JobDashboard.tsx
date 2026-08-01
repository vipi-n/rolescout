"use client";

import { useEffect, useMemo, useState } from "react";

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
  track?: string;
  trackLabel?: string;
};

type SearchProfile = {
  id: string;
  label: string;
  roles: string[];
  skills: string[];
  locations: string[];
  experienceYears: { min: number; max: number };
};

type DigestConfig = {
  brandName: string;
  timezone: string;
  schedule: string[];
  maxJobsPerRun: number;
  searchProfiles: SearchProfile[];
};

type Theme = "light" | "dark";
type ApplicationStatus = "Applied" | "Rejected" | "Interview";
type StatusFilter = "All" | "To apply" | ApplicationStatus;

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
  const defaultTrack = config.searchProfiles[0].id;
  const [selectedTrack, setSelectedTrack] = useState(defaultTrack);
  const [theme, setTheme] = useState<Theme>("light");
  const [query, setQuery] = useState("");
  const [workplace, setWorkplace] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [jobStatuses, setJobStatuses] = useState<
    Record<string, ApplicationStatus>
  >(() => {
    if (typeof window === "undefined") return {};
    try {
      const storedStatuses = window.localStorage.getItem(
        "rolescout-job-statuses",
      );
      return storedStatuses ? JSON.parse(storedStatuses) : {};
    } catch {
      return {};
    }
  });
  const [copiedLink, setCopiedLink] = useState("");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("rolescout-theme");
    const preferredTheme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = preferredTheme;
    window.requestAnimationFrame(() => setTheme(preferredTheme));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "rolescout-job-statuses",
      JSON.stringify(jobStatuses),
    );
  }, [jobStatuses]);

  useEffect(() => {
    const requestedTrack = new URLSearchParams(window.location.search).get(
      "track",
    );
    if (
      requestedTrack &&
      config.searchProfiles.some((profile) => profile.id === requestedTrack)
    ) {
      window.requestAnimationFrame(() => {
        setSelectedTrack(requestedTrack);
        window.requestAnimationFrame(() => {
          if (window.location.hash) {
            const target = document.querySelector(window.location.hash);
            target?.scrollIntoView({ block: "center" });
          }
        });
      });
    }
  }, [config.searchProfiles]);

  const activeProfile =
    config.searchProfiles.find((profile) => profile.id === selectedTrack) ??
    config.searchProfiles[0];
  const trackJobs = useMemo(
    () =>
      initialJobs.filter(
        (job) =>
          (job.track ?? defaultTrack) === selectedTrack,
      ),
    [defaultTrack, initialJobs, selectedTrack],
  );
  const jobs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return trackJobs.filter((job) => {
      const matchesQuery =
        !needle ||
        [job.title, job.company, job.location, job.skills.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      const matchesWorkplace =
        workplace === "All" ||
        job.workplace.toLowerCase() === workplace.toLowerCase();
      const status = jobStatuses[job.id];
      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "To apply" ? !status : status === statusFilter);
      return matchesQuery && matchesWorkplace && matchesStatus;
    });
  }, [jobStatuses, query, statusFilter, trackJobs, workplace]);

  const companies = new Set(trackJobs.map((job) => job.company)).size;
  const [snapshotTime] = useState(() => Date.now());
  const freshCount = trackJobs.filter(
    (job) => snapshotTime - new Date(job.firstSeenAt).getTime() < 86_400_000,
  ).length;
  const topMatch = Math.max(...trackJobs.map((job) => job.matchScore), 0);
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

  function chooseTrack(track: string) {
    setSelectedTrack(track);
    const url = new URL(window.location.href);
    url.searchParams.set("track", track);
    url.hash = "all-jobs";
    window.history.replaceState({}, "", url);
  }

  function updateJobStatus(jobId: string, status: string) {
    setJobStatuses((current) => {
      const next = { ...current };
      if (!status) delete next[jobId];
      else next[jobId] = status as ApplicationStatus;
      return next;
    });
  }

  async function copyJobLink(job: Job) {
    try {
      await navigator.clipboard.writeText(job.url);
      setCopiedLink(job.id);
      window.setTimeout(() => setCopiedLink(""), 1600);
    } catch {
      setCopiedLink("");
    }
  }

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("rolescout-theme", nextTheme);
    setTheme(nextTheme);
  }

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
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            type="button"
          >
            <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
            <small>{theme === "dark" ? "Light" : "Dark"}</small>
          </button>
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
              Roles matched to
              <br />
              <span>your next move.</span>
            </h1>
            <p className="hero-copy">
              Curated LinkedIn opportunities matched to your skills,
              experience, and preferred locations.
            </p>
          </div>
          <aside className="brief-card" aria-label="Current search brief">
            <div className="brief-head">
              <span>YOUR SEARCH BRIEF</span>
              <span className="active-badge">{activeProfile.label}</span>
            </div>
            <dl>
              <div className="brief-detail">
                <details>
                  <summary>ROLES</summary>
                  <div className="brief-detail-value">
                    {activeProfile.roles.join(" · ")}
                  </div>
                </details>
              </div>
              <div className="brief-detail">
                <details>
                  <summary>SKILLS</summary>
                  <div className="brief-detail-value">
                    {activeProfile.skills.join(" · ")}
                  </div>
                </details>
              </div>
              <div className="brief-split">
                <span>
                  <dt>EXPERIENCE</dt>
                  <dd>
                    {activeProfile.experienceYears.min}–
                    {activeProfile.experienceYears.max} years
                  </dd>
                </span>
                <span>
                  <dt>LOCATION</dt>
                  <dd>{activeProfile.locations.join(" · ")}</dd>
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
        <div className="track-switcher">
          <div>
            <span className="section-kicker">JOB TRACK</span>
            <strong>Choose the profile you want to explore</strong>
          </div>
          <div className="track-switch" aria-label="Choose job track">
            {config.searchProfiles.map((profile) => (
              <button
                aria-pressed={selectedTrack === profile.id}
                className={selectedTrack === profile.id ? "selected" : ""}
                key={profile.id}
                onClick={() => chooseTrack(profile.id)}
                type="button"
              >
                <span>{profile.label}</span>
                <small>
                  {profile.experienceYears.min}–
                  {profile.experienceYears.max} years
                </small>
              </button>
            ))}
          </div>
        </div>

        <div className="snapshot" aria-label="Latest job snapshot">
          <div>
            <span>TOTAL JOBS</span>
            <strong>{trackJobs.length}</strong>
            <small>in this profile</small>
          </div>
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
            <span>TOP MATCH</span>
            <strong>{topMatch}%</strong>
            <small>based on your brief</small>
          </div>
        </div>

        <div className="toolbar" id="all-jobs">
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

        <div className="status-toolbar" aria-label="Filter by application status">
          <span>Application status</span>
          <div className="segmented">
            {(["All", "To apply", "Applied", "Interview", "Rejected"] as StatusFilter[]).map(
              (value) => (
                <button
                  className={statusFilter === value ? "selected" : ""}
                  key={value}
                  onClick={() => setStatusFilter(value)}
                  type="button"
                >
                  {value}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="job-list">
          {jobs.map((job, index) => (
            <article className="job-card" id={`job-${job.id}`} key={job.id}>
              <div className="company-mark">{getCompanyMark(job.company)}</div>
              <div className="job-main">
                <div className="job-title-row">
                  <div>
                    <p className="company-name">
                      {job.company} · {activeProfile.label}
                    </p>
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
                <a
                  aria-label={
                    "Open " + job.title + " application on " + job.source
                  }
                  href={job.url}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on {job.source} <Arrow />
                </a>
                <button
                  className="copy-link-button"
                  type="button"
                  onClick={() => copyJobLink(job)}
                >
                  {copiedLink === job.id ? "Copied" : "Copy link"}
                </button>
                <label className="job-status">
                  <span className="sr-only">Application status</span>
                  <select
                    aria-label={"Set application status for " + job.title}
                    value={jobStatuses[job.id] ?? ""}
                    onChange={(event) =>
                      updateJobStatus(job.id, event.target.value)
                    }
                  >
                    <option value="">To apply</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </label>
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
