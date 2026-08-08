const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const serverPath = path.join(ROOT, "server", "server.js");
const dashboardPath = path.join(ROOT, "src", "pages", "Dashboard.jsx");

const requiredFiles = [
  path.join(ROOT, "server", "controllers", "aiAssistantController.js"),
  path.join(ROOT, "server", "routes", "aiAssistant.js"),
  path.join(ROOT, "server", "services", "aiService.js"),
  path.join(ROOT, "server", "services", "assistantTools.js"),
  path.join(ROOT, "src", "components", "ai", "SchoolAssistant.jsx"),
  path.join(ROOT, "src", "components", "ai", "SchoolAssistant.css"),
  path.join(ROOT, "src", "data", "assistantKnowledge.js"),
];

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

for (const filePath of [serverPath, dashboardPath, ...requiredFiles]) {
  if (!fs.existsSync(filePath)) fail(`الملف غير موجود: ${filePath}`);
}

const backupOnce = (filePath, suffix) => {
  const backupPath = `${filePath}.${suffix}`;
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath);
    console.log(`Backup: ${backupPath}`);
  }
};

const patchServer = () => {
  let source = fs.readFileSync(serverPath, "utf8");
  const requireLine = 'const aiAssistantRoutes = require("./routes/aiAssistant");';
  const useLine = 'app.use("/ai-assistant", aiAssistantRoutes);';

  if (!source.includes(requireLine) || !source.includes(useLine)) {
    backupOnce(serverPath, "ai-backup");
  }

  if (!source.includes(requireLine)) {
    const routeRequireRegex = /^const\s+\w+\s*=\s*require\(["']\.\/routes\/[^"']+["']\);\s*$/gm;
    const matches = [...source.matchAll(routeRequireRegex)];

    if (matches.length) {
      const last = matches[matches.length - 1];
      const insertAt = last.index + last[0].length;
      source = source.slice(0, insertAt) + "\n" + requireLine + source.slice(insertAt);
    } else {
      const expressLine = source.match(/^const\s+express\s*=\s*require\(["']express["']\);\s*$/m);
      if (!expressLine || expressLine.index === undefined) {
        fail("تعذر تحديد مكان require داخل server/server.js");
      }
      const insertAt = expressLine.index + expressLine[0].length;
      source = source.slice(0, insertAt) + "\n" + requireLine + source.slice(insertAt);
    }
  }

  if (!source.includes(useLine)) {
    const listenIndex = source.indexOf("app.listen");
    if (listenIndex === -1) fail("تعذر العثور على app.listen داخل server/server.js");
    source = source.slice(0, listenIndex) + `${useLine}\n\n` + source.slice(listenIndex);
  }

  fs.writeFileSync(serverPath, source, "utf8");
  console.log("SUCCESS: تم ربط /ai-assistant داخل server/server.js");
};

const patchDashboard = () => {
  let source = fs.readFileSync(dashboardPath, "utf8");
  const importLine = 'import SchoolAssistant from "../components/ai/SchoolAssistant";';

  if (!source.includes(importLine) || !source.includes("<SchoolAssistant")) {
    backupOnce(dashboardPath, "ai-backup");
  }

  if (!source.includes(importLine)) {
    const anchor = 'import ReportPrintHeader from "../components/common/ReportPrintHeader";';
    if (!source.includes(anchor)) fail("تعذر تحديد مكان import داخل Dashboard.jsx");
    source = source.replace(anchor, `${anchor}\n${importLine}`);
  }

  if (!source.includes("<SchoolAssistant")) {
    const startMarker = '<div className="global-search">';
    const endMarker = '<div className="header-account-actions">';
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start);

    if (start === -1 || end === -1 || end <= start) {
      fail("تعذر العثور على خانة البحث الحالية داخل Dashboard.jsx. لم يتم حذف أي شيء.");
    }

    source =
      source.slice(0, start) +
      '<SchoolAssistant onNavigate={navigate} dashboardContext={stats} />\n\n                ' +
      source.slice(end);
  }

  fs.writeFileSync(dashboardPath, source, "utf8");
  console.log("SUCCESS: تم استبدال خانة البحث بمساعد الكوفة الذكي داخل Dashboard.jsx");
};

patchDashboard();
patchServer();

console.log("");
console.log("SUCCESS: اكتمل ربط المرحلة الأولى من مساعد الكوفة الذكي.");
console.log("أعد تشغيل الخادم والواجهة ثم اختبر /ai-assistant/health.");