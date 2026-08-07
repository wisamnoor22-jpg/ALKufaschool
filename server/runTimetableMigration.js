const fs = require("fs");
const path = require("path");
const pool = require("./db");

const migrationPath = path.join(
  __dirname,
  "migrations",
  "005_create_timetables.sql"
);

const runMigration = async () => {
  try {
    const sql = fs.readFileSync(migrationPath, "utf8");
    await pool.query(sql);
    console.log("SUCCESS: تم إنشاء جداول الحصص بنجاح");
  } catch (error) {
    console.error("ERROR: فشل تشغيل ملف الجداول");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

runMigration();