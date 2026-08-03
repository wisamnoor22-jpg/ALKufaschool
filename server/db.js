const { Pool } = require("pg");
require("dotenv").config();

const requiredEnvVariables = [
  "DB_USER",
  "DB_HOST",
  "DB_NAME",
  "DB_PASSWORD",
];

const missingEnvVariables = requiredEnvVariables.filter(
  (variableName) => !process.env[variableName]
);

if (missingEnvVariables.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVariables.join(", ")}`
  );
}

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
});

// فحص الاتصال مرة واحدة فقط عند تشغيل السيرفر
(async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  } catch (error) {
    console.error("❌ PostgreSQL connection failed:", error);
    process.exit(1);
  }
})();

pool.on("error", (error) => {
  console.error("Unexpected PostgreSQL error:", error);
});

module.exports = pool;