import type { Metadata } from "next";
import jobs from "../data/jobs.json";
import config from "../config/digest.config.json";
import { JobDashboard } from "./JobDashboard";

export const metadata: Metadata = {
  title: "RoleScout — Curated job alerts",
  description:
    "A twice-daily feed of LinkedIn roles matched to your skills, experience, and location.",
};

export default function Home() {
  return <JobDashboard initialJobs={jobs.jobs} config={config} />;
}
