const eventName = process.env.GITHUB_EVENT_NAME;

if (eventName === "workflow_dispatch" || eventName === "schedule") {
  console.log(`${eventName} run requested.`);
  process.exit(0);
}

console.log(`${eventName || "Unknown"} runs use their dedicated workflow rules.`);
process.exit(1);
