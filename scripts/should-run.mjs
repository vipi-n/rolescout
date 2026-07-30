import { readJson } from "./lib.mjs";

const config = await readJson("config/digest.config.json");

if (process.env.GITHUB_EVENT_NAME === "workflow_dispatch") {
  console.log("Manual run requested.");
  process.exit(0);
}

const parts = new Intl.DateTimeFormat("en-GB", {
  timeZone: config.timezone,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
}).formatToParts(new Date());
const hour = Number(parts.find((part) => part.type === "hour")?.value);
const minute = Number(parts.find((part) => part.type === "minute")?.value);
const nowMinutes = hour * 60 + minute;

const shouldRun = config.schedule.some((time) => {
  const [scheduledHour, scheduledMinute] = time.split(":").map(Number);
  const scheduled = scheduledHour * 60 + scheduledMinute;
  return nowMinutes >= scheduled && nowMinutes - scheduled < 30;
});

console.log(
  shouldRun
    ? `Digest window matched at ${hour}:${String(minute).padStart(2, "0")} ${config.timezone}.`
    : `No digest window at ${hour}:${String(minute).padStart(2, "0")} ${config.timezone}.`,
);
process.exit(shouldRun ? 0 : 1);
