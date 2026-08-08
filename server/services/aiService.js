const DEFAULT_MODEL = "gemini-2.5-flash";
const GEMINI_API_BASE =
  process.env.GEMINI_API_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

const cleanText = (value, maxLength = 14000) => {
  if (value === null || value === undefined) return "";
  return String(value).slice(0, maxLength);
};

const compactDashboardContext = (dashboardContext) => {
  if (!dashboardContext || typeof dashboardContext !== "object") {
    return "لا توجد إحصائيات لوحة تحكم مرفقة في هذا الطلب.";
  }

  try {
    return cleanText(JSON.stringify(dashboardContext), 14000);
  } catch {
    return "تعذر تحويل إحصائيات لوحة التحكم إلى نص.";
  }
};

const buildSystemInstruction = ({ currentPath, dashboardContext }) => `
أنت "مساعد الكوفة الذكي" داخل برنامج مدرسة الكوفة.

المهام:
- اشرح للمستخدم طريقة استعمال برنامج المدرسة بلغة عربية واضحة ومباشرة.
- أجب عن الأسئلة المتعلقة بأقسام البرنامج ووظائفه.
- يمكنك استخدام إحصائيات لوحة التحكم المرفقة فقط عند السؤال عن أرقام حالية.
- إذا لم تكن المعلومة موجودة في السياق فلا تخترع رقمًا أو زرًا أو صفحة.
- لا تدّعِ أنك نفذت حذفًا أو تعديلًا أو عملية في قاعدة البيانات.
- لا تطلب كلمات مرور أو مفاتيح API أو أسرارًا.
- إذا احتاج المستخدم إلى إجراء داخل البرنامج، اشرح الخطوات باختصار.
- اجعل الإجابة مختصرة ومناسبة لواجهة المساعد.

المسار الحالي في البرنامج:
${cleanText(currentPath || "/dashboard", 180)}

إحصائيات لوحة التحكم المتاحة لهذا الطلب:
${compactDashboardContext(dashboardContext)}
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
            }),
          },
        ],
      },
      contents: buildContents({ message, history }),
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 700,
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