const fs = require("fs/promises");
const path = require("path");
const { Client } = require("pg");
const { loadEnv } = require("../config/load-env");

loadEnv();

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    const migrationsDir = path.join(__dirname, "..", "db", "migrations");
    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      console.log(`Applied migration: ${file}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
