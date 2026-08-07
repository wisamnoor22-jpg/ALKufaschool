const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const backupPath = path.join(__dirname, "server.js.student-sections-backup");
const requireLine =
  'const studentSectionsRoutes = require("./routes/studentSections");';
const useLine = 'app.use("/student-sections", studentSectionsRoutes);';

if (!fs.existsSync(serverPath)) {
  throw new Error(`server.js غير موجود في: ${serverPath}`);
}

let source = fs.readFileSync(serverPath, "utf8");
const original = source;

if (!source.includes(requireLine)) {
  const appMarker = /const\s+app\s*=\s*express\(\)\s*;/;
  const match = source.match(appMarker);

  if (!match) {
    throw new Error("تعذر العثور على const app = express(); داخل server.js");
  }

  const index = match.index;
  source = `${source.slice(0, index)}${requireLine}\n${source.slice(index)}`;
}

if (!source.includes(useLine)) {
  const studentsUse = /app\.use\(\s*["']\/students["']\s*,[^\n;]+;\s*/;
  const studentsMatch = source.match(studentsUse);

  if (studentsMatch) {
    const insertionPoint = studentsMatch.index + studentsMatch[0].length;
    source = `${source.slice(0, insertionPoint)}\n${useLine}\n${source.slice(insertionPoint)}`;
  } else {
    const listenMarker = /app\.listen\s*\(/;
    const listenMatch = source.match(listenMarker);

    if (!listenMatch) {
      throw new Error("تعذر تحديد مكان ربط المسار داخل server.js");
    }

    source = `${source.slice(0, listenMatch.index)}${useLine}\n\n${source.slice(listenMatch.index)}`;
  }
}

if (source === original) {
  console.log("student-sections route is already installed.");
  process.exit(0);
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(serverPath, backupPath);
}

fs.writeFileSync(serverPath, source, "utf8");
console.log("SUCCESS: تم ربط /student-sections داخل server.js");
console.log(`Backup: ${backupPath}`);