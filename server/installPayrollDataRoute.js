const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "server.js");
const backupPath = path.join(__dirname, "server.js.payroll-data-backup");

if (!fs.existsSync(serverPath)) {
  console.error("ERROR: لم يتم العثور على server.js");
  process.exit(1);
}

let source = fs.readFileSync(serverPath, "utf8");

const requireLine = 'const payrollDataRoutes = require("./routes/payrollData");';
const useLine = 'app.use("/payroll-data", payrollDataRoutes);';

if (source.includes(requireLine) && source.includes(useLine)) {
  console.log("INFO: مسار /payroll-data مربوط مسبقًا داخل server.js");
  process.exit(0);
}

if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(serverPath, backupPath);
}

if (!source.includes(requireLine)) {
  const routeRequireRegex = /^const\s+\w+\s*=\s*require\(["']\.\/routes\/[^"']+["']\);\s*$/gm;
  const matches = [...source.matchAll(routeRequireRegex)];

  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const insertAt = last.index + last[0].length;
    source = `${source.slice(0, insertAt)}\n${requireLine}${source.slice(insertAt)}`;
  } else {
    const expressRequireIndex = source.indexOf('require("express")');
    if (expressRequireIndex === -1) {
      console.error("ERROR: تعذر تحديد مكان إضافة require داخل server.js");
      process.exit(1);
    }
    const lineEnd = source.indexOf("\n", expressRequireIndex);
    source = `${source.slice(0, lineEnd + 1)}${requireLine}\n${source.slice(lineEnd + 1)}`;
  }
}

if (!source.includes(useLine)) {
  const routeUseRegex = /^app\.use\(["'][^"']+["']\s*,[^\n]+\);\s*$/gm;
  const matches = [...source.matchAll(routeUseRegex)];

  if (matches.length > 0) {
    const last = matches[matches.length - 1];
    const insertAt = last.index + last[0].length;
    source = `${source.slice(0, insertAt)}\n${useLine}${source.slice(insertAt)}`;
  } else {
    const listenIndex = source.indexOf("app.listen");
    if (listenIndex === -1) {
      console.error("ERROR: تعذر تحديد مكان إضافة app.use داخل server.js");
      process.exit(1);
    }
    source = `${source.slice(0, listenIndex)}${useLine}\n\n${source.slice(listenIndex)}`;
  }
}

fs.writeFileSync(serverPath, source, "utf8");
console.log("SUCCESS: تم ربط /payroll-data داخل server.js");
console.log(`Backup: ${backupPath}`);