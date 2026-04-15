const fs = require("fs");
const path = require("path");

function stripQuotes(value) {
  if (!value) return value;
  const starts = value.startsWith('"') || value.startsWith("'");
  const ends = value.endsWith('"') || value.endsWith("'");
  if (starts && ends && value.length >= 2) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFromFile(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = stripQuotes(trimmed.slice(eqIndex + 1).trim());
    if (!key) continue;
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const rootEnv = path.join(process.cwd(), ".env");
  loadEnvFromFile(rootEnv);
}

module.exports = { loadEnv };
