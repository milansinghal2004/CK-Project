const fs = require("fs/promises");
const path = require("path");
const { Client } = require("pg");
const { loadEnv } = require("../config/load-env");

loadEnv();

async function run() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for seeding.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const seedDir = path.join(__dirname, "..", "db", "seeds");
    const files = (await fs.readdir(seedDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const sql = await fs.readFile(path.join(seedDir, file), "utf8");
      await client.query(sql);
      console.log(`Applied seed: ${file}`);
    }
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
