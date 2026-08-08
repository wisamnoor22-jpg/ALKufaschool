const fs = require("fs");
const path = require("path");
const db = require("./db");

const migrationPath = path.join(
  __dirname,
  "migrations",
  "008_create_student_section_transfers.sql"
);

const run = async () => {
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`لم يتم العثور على ملف Migration: ${migrationPath}`);
  }

  const sql = fs.readFileSync(migrationPath, "utf8");
  await db.query(sql);

  console.log("SUCCESS: تم إنشاء سجل تنقلات الطلاب بين الشعب بنجاح");
};

run()
  .then(async () => {
    if (typeof db.end === "function") {
      await db.end();
    }
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("ERROR:", error.message || error);
    if (typeof db.end === "function") {
      await db.end().catch(() => {});
    }
    process.exit(1);
  });