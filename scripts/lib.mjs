import { readFile } from "node:fs/promises";

export const rootUrl = new URL("../", import.meta.url);

export async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, rootUrl), "utf8"));
}

export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function stripHtml(value = "") {
  return value
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function absoluteSiteUrl(value) {
  return String(value || "").replace(/\/+$/, "");
}
