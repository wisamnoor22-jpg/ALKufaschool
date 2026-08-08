const { askGemini } = require("../services/aiService");
const {
  PROGRAM_SECTIONS,
  FAQS,
  findLocalAnswer,
} = require("../services/assistantTools");

const MAX_MESSAGE_LENGTH = 2400;
const MAX_HISTORY_ITEMS = 12;

const getHealth = async (req, res) => {
  const configured = Boolean(
    String(process.env.GEMINI_API_KEY || "").trim()
  );

  return res.json({
    ok: true,
    configured,
    provider: "gemini",
    model: String(process.env.GEMINI_MODEL || "gemini-2.5-flash"),
    faqCount: FAQS.length,
    sectionCount: PROGRAM_SECTIONS.length,
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

    const localAnswer = findLocalAnswer(message);

    if (localAnswer) {
      return res.json({
        answer: localAnswer.answer,
        source: "guide",
        suggestedPath: localAnswer.suggestedPath,
        suggestedLabel: localAnswer.suggestedLabel,
      });
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

    const result = await askGemini({
      message,
      history,
      currentPath,
      dashboardContext,
    });

    return res.json({
      answer: result.answer,
      source: "gemini",
      model: result.model,
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
          "تعذر التحقق من مفتاح Gemini أو لا توجد صلاحية لهذا المشروع. راجع المفتاح في Google AI Studio.",
      });
    }

    if (error.status === 429) {
      return res.status(503).json({
        message:
          "تم بلوغ حد الاستخدام المجاني لـ Gemini أو أن الحصة المجانية غير متاحة لهذا المشروع حاليًا.",
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