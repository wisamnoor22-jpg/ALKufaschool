const { askGemini } = require("../services/aiService");
const {
  PROGRAM_SECTIONS,
  FAQS,
  findLocalAnswer,
} = require("../services/assistantTools");
const {
  buildAssistantDatabaseContext,
} = require("../services/assistantDataService");
const {
  buildDirectDatabaseAnswer,
} = require("../services/assistantDirectAnswer");

const MAX_MESSAGE_LENGTH = 2400;
const MAX_HISTORY_ITEMS = 12;

const isInstructionQuestion = (message) => {
  const normalized = String(message || "").trim();
  return /^(كيف|أين|اين|وين|من وين|من أين)\b/.test(normalized);
};

const getHealth = async (req, res) => {
  const configured = Boolean(
    String(process.env.GEMINI_API_KEY || "").trim()
  );

  return res.json({
    ok: true,
    configured,
    provider: "gemini",
    model: String(process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"),
    faqCount: FAQS.length,
    sectionCount: PROGRAM_SECTIONS.length,
    databaseReadEnabled: true,
    databaseScope: "all-school-modules-read-only",
    groundedAnswersEnabled: true,
  });
};

const chat = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();

    if (!message) {
      return res.status(400).json({
        message: "اكتب سؤالك أولًا.",
      });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        message: `السؤال طويل جدًا. الحد الأقصى ${MAX_MESSAGE_LENGTH} حرفًا.`,
      });
    }

    if (isInstructionQuestion(message)) {
      const localAnswer = findLocalAnswer(message);

      if (localAnswer) {
        return res.json({
          answer: localAnswer.answer,
          source: "guide",
          suggestedPath: localAnswer.suggestedPath,
          suggestedLabel: localAnswer.suggestedLabel,
        });
      }
    }

    const history = Array.isArray(req.body?.history)
      ? req.body.history.slice(-MAX_HISTORY_ITEMS)
      : [];

    const currentPath = String(
      req.body?.currentPath || "/dashboard"
    ).slice(0, 180);

    const dashboardContext =
      req.body?.dashboardContext &&
      typeof req.body.dashboardContext === "object"
        ? req.body.dashboardContext
        : null;

    const databaseContext = await buildAssistantDatabaseContext(message);

    const directAnswer = buildDirectDatabaseAnswer({
      message,
      databaseContext,
    });

    if (directAnswer) {
      return res.json({
        answer: directAnswer,
        source: "database",
        dataAccess: "read-only",
      });
    }

    const result = await askGemini({
      message,
      history,
      currentPath,
      dashboardContext,
      databaseContext,
    });

    return res.json({
      answer: result.answer,
      source: "gemini",
      model: result.model,
      dataAccess: "read-only",
    });
  } catch (error) {
    console.error("AI assistant error:", {
      code: error.code,
      status: error.status,
      geminiStatus: error.geminiStatus,
      geminiCode: error.geminiCode,
    });

    if (error.code === "GEMINI_API_KEY_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "مفتاح Gemini غير مضبوط في الخادم. أضف GEMINI_API_KEY داخل server/.env ثم أعد تشغيل الخادم.",
      });
    }

    if (error.status === 400) {
      return res.status(502).json({
        message:
          "Gemini رفض الطلب. راجع اسم النموذج وإعدادات Gemini API.",
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(502).json({
        message:
          "تعذر التحقق من مفتاح Gemini أو لا توجد صلاحية لهذا المشروع. راجع إعدادات Gemini API.",
      });
    }

    if (error.status === 429) {
      return res.status(503).json({
        message:
          "تم بلوغ حد استخدام Gemini لهذا المشروع حاليًا.",
      });
    }

    return res.status(502).json({
      message:
        "تعذر الحصول على رد من مساعد Gemini الآن. حاول مرة أخرى بعد قليل.",
    });
  }
};

module.exports = {
  getHealth,
  chat,
};