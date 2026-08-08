const {
  PROGRAM_SECTIONS,
  FAQS,
} = require("./assistantTools");

const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

const cleanText = (value, maxLength = 50000) => {
  if (value === null || value === undefined) return "";
  return String(value).slice(0, maxLength);
};

const compactContext = (value, emptyMessage, maxLength) => {
  if (!value || typeof value !== "object") {
    return emptyMessage;
  }

  try {
    return cleanText(JSON.stringify(value), maxLength);
  } catch {
    return emptyMessage;
  }
};

const buildProgramGuide = () =>
  PROGRAM_SECTIONS.map(
    (section) =>
      `- ${section.title} (${section.path}): ${section.description}`
  ).join("\n");

const buildFaqGuide = () =>
  FAQS.map((faq) => `س: ${faq.question}\nج: ${faq.answer}`).join("\n\n");

const buildSystemInstruction = ({
  currentPath,
  dashboardContext,
  databaseContext,
}) => `
أنت "مساعد مدرسة الكوفة الذكي" داخل برنامج مدرسة الكوفة الأهلية التكميلية المختلطة.

قاعدة أساسية شديدة الأهمية:
بيانات PostgreSQL الموجودة في نهاية هذه التعليمات هي بيانات حقيقية من النظام الحالي.
إذا ظهر حقل داخلها فهو متاح لك ويجب استخدامه.
لا تقل إن تفاصيل غير متوفرة إذا كان الحقل أو الصف موجودًا فعليًا في بيانات PostgreSQL.

أمثلة إلزامية:
- إذا ظهر databaseContext.payroll فهو يحتوي صفوف الرواتب الفردية. اقرأ salary لكل موظف عند السؤال عن الرواتب.
- إذا ظهر databaseContext.staff.teachers فهو يحتوي المعلمات واختصاصاتهن.
- إذا ظهر databaseContext.mentioned_employee فهو بيانات الشخص المذكور في السؤال.
- إذا ظهر databaseContext.mentioned_student فهو بيانات الطالب المذكور.
- إذا ظهر databaseContext.timetable فهو جدول الحصص الحقيقي المتاح للسؤال.
- إذا ظهر databaseContext.attendance فهو بيانات الحضور الحقيقية المتاحة للسؤال.
- إذا ظهر databaseContext.finance فهو بيانات الحسابات والدفعات المتاحة للسؤال.
- إذا ظهر databaseContext.results فهو بيانات الدرجات المتاحة للسؤال.

مهامك:
- شرح جميع أقسام البرنامج وكيفية استخدامها.
- الإجابة عن بيانات الطلاب والكادر والاختصاصات والحضور والحسابات والرواتب والجداول والدرجات والعطل والسنوات الدراسية وسجل المحذوفات والتنقلات والوثائق عندما تصل بياناتها.
- إجراء الحسابات البسيطة من الصفوف الموجودة مثل العد والجمع والمتوسط.
- الربط بين أكثر من قسم عندما يطلب المستخدم ذلك.

قواعد الدقة:
- افحص جميع مفاتيح وحقول بيانات PostgreSQL قبل أن تقول إن المعلومة غير موجودة.
- لا تعتمد على التخمين أو معلومات سابقة إذا كانت البيانات الحية موجودة.
- إذا لم يصل الحقل المطلوب فعلًا، قل: "هذه المعلومة لم تصل ضمن بيانات هذا السؤال".
- لا تخترع أسماء أو اختصاصات أو أرقامًا أو مبالغ.
- صلاحيتك READ ONLY: لا تدّعِ أنك أضفت أو عدلت أو حذفت سجلًا.
- لا تطلب أو تعرض كلمات مرور أو API Keys أو أسرار .env.
- لا تذكر SQL أو أسماء الجداول للمستخدم النهائي إلا إذا طلب شرحًا تقنيًا.
- أجب بالعربية بوضوح وبشكل مباشر، واستخدم القوائم عند الحاجة.

الصفحة الحالية:
${cleanText(currentPath || "/dashboard", 180)}

دليل أقسام البرنامج:
${buildProgramGuide()}

الأسئلة الشائعة:
${buildFaqGuide()}

إحصائيات الواجهة:
${compactContext(
  dashboardContext,
  "لا توجد إحصائيات واجهة مرفقة.",
  14000
)}

بيانات PostgreSQL الحية لهذا السؤال:
${compactContext(
  databaseContext,
  "لم تصل بيانات PostgreSQL لهذا السؤال.",
  60000
)}
`.trim();

const normalizeRole = (role) => (role === "assistant" ? "model" : "user");

const buildContents = ({ message, history }) => {
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];

  const contents = safeHistory
    .filter(
      (item) =>
        item &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim()
    )
    .map((item) => ({
      role: normalizeRole(item.role),
      parts: [{ text: cleanText(item.content.trim(), 4000) }],
    }));

  contents.push({
    role: "user",
    parts: [{ text: cleanText(message, 4000) }],
  });

  return contents;
};

const extractGeminiText = (data) => {
  const parts = data?.candidates?.[0]?.content?.parts;

  if (!Array.isArray(parts)) return "";

  return parts
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
};

const createGeminiError = (status, data) => {
  const error = new Error(
    data?.error?.message || `Gemini API request failed with status ${status}`
  );

  error.status = status;
  error.code = data?.error?.status || "GEMINI_API_ERROR";
  error.geminiStatus = data?.error?.status;
  error.geminiCode = data?.error?.code;

  return error;
};

const askGemini = async ({
  message,
  history = [],
  currentPath = "/dashboard",
  dashboardContext = null,
  databaseContext = null,
}) => {
  const apiKey = String(process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured");
    error.code = "GEMINI_API_KEY_NOT_CONFIGURED";
    throw error;
  }

  const model = String(process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();

  const url = `${GEMINI_API_BASE}/models/${encodeURIComponent(
    model
  )}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: buildSystemInstruction({
              currentPath,
              dashboardContext,
              databaseContext,
            }),
          },
        ],
      },
      contents: buildContents({ message, history }),
      generationConfig: {
        temperature: 0.05,
        maxOutputTokens: 1600,
      },
    }),
  });

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw createGeminiError(response.status, data);
  }

  const answer = extractGeminiText(data);

  if (!answer) {
    const error = new Error("Gemini returned no text");
    error.code = "GEMINI_EMPTY_RESPONSE";
    throw error;
  }

  return {
    answer,
    model,
  };
};

module.exports = {
  askGemini,
};