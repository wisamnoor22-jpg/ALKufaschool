// SchoolAssistant UI V4 - compact shortcuts + custom AI icon
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ASSISTANT_QUICK_QUESTIONS,
  ASSISTANT_SECTIONS,
} from "../../data/assistantKnowledge";
import "./SchoolAssistant.css";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const CHAT_URL = `${API_BASE}/ai-assistant/chat`;
const HEALTH_URL = `${API_BASE}/ai-assistant/health`;
const SESSION_KEY = "alkufa-ai-assistant-history-v1";

const initialMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "أهلًا، أنا مساعد مدرسة الكوفة الذكي. اسألني عن طريقة استخدام البرنامج أو عن إحصائيات لوحة التحكم الحالية.",
};

const readStoredMessages = () => {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || "[]");
    if (!Array.isArray(parsed) || !parsed.length) return [initialMessage];

    return [
      initialMessage,
      ...parsed
        .filter(
          (item) =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
        )
        .slice(-18),
    ];
  } catch {
    return [initialMessage];
  }
};

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const renderInlineMarkdown = (text, keyPrefix) => {
  const parts = String(text || "")
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g)
    .filter(Boolean);

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;

    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={key}>{part.slice(1, -1)}</code>;
    }

    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
};

const AssistantMessageContent = ({ content }) => {
  const lines = String(content || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  const elements = [];
  let listItems = [];
  let listType = null;
  let listCounter = 0;

  const flushList = () => {
    if (!listItems.length || !listType) return;

    const ListTag = listType === "ordered" ? "ol" : "ul";
    const currentItems = [...listItems];

    elements.push(
      <ListTag
        key={`list-${listCounter}`}
        className={`school-ai-content-list ${listType}`}
      >
        {currentItems.map((item, index) => (
          <li key={`list-${listCounter}-${index}`}>
            {renderInlineMarkdown(item, `list-${listCounter}-${index}`)}
          </li>
        ))}
      </ListTag>
    );

    listCounter += 1;
    listItems = [];
    listType = null;
  };

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();

    if (!line) {
      flushList();

      if (elements.length) {
        elements.push(
          <div
            key={`space-${lineIndex}`}
            className="school-ai-content-spacer"
            aria-hidden="true"
          />
        );
      }

      return;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      flushList();

      elements.push(
        <div
          key={`heading-${lineIndex}`}
          className={`school-ai-content-heading level-${headingMatch[1].length}`}
        >
          {renderInlineMarkdown(
            headingMatch[2],
            `heading-${lineIndex}`
          )}
        </div>
      );

      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);

    if (bulletMatch) {
      if (listType && listType !== "unordered") flushList();
      listType = "unordered";
      listItems.push(bulletMatch[1]);
      return;
    }

    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/);

    if (numberedMatch) {
      if (listType && listType !== "ordered") flushList();
      listType = "ordered";
      listItems.push(numberedMatch[1]);
      return;
    }

    flushList();

    elements.push(
      <p key={`paragraph-${lineIndex}`}>
        {renderInlineMarkdown(line, `paragraph-${lineIndex}`)}
      </p>
    );
  });

  flushList();

  return <div className="school-ai-message-content">{elements}</div>;
};

export default function SchoolAssistant({ onNavigate, dashboardContext = null }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(readStoredMessages);
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const inputRef = useRef(null);
  const chatEndRef = useRef(null);

  const historyForApi = useMemo(
    () =>
      messages
        .filter((item) => item.id !== "welcome")
        .slice(-10)
        .map((item) => ({ role: item.role, content: item.content })),
    [messages]
  );

  useEffect(() => {
    try {
      const stored = messages
        .filter((item) => item.id !== "welcome")
        .slice(-18)
        .map(({ role, content }) => ({ role, content }));

      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(stored));
    } catch {
      // Keep the assistant usable even when sessionStorage is unavailable.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);

    fetch(HEALTH_URL, { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ ok: false, configured: false }));

    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, open]);

  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open]);

  const appendAssistantError = (text) => {
    setMessages((current) => [
      ...current,
      { id: makeId(), role: "assistant", content: text, isError: true },
    ]);
  };

  const sendQuestion = async (question) => {
    const message = String(question || "").trim();
    if (!message || loading) return;

    setOpen(true);
    setInput("");

    const userMessage = { id: makeId(), role: "user", content: message };
    setMessages((current) => [...current, userMessage]);
    setLoading(true);

    try {
      const response = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history: historyForApi,
          currentPath: window.location.pathname,
          dashboardContext,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "تعذر الاتصال بالمساعد الذكي.");
      }

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content: data.answer || "لم يصل رد من المساعد.",
          suggestedPath: data.suggestedPath || null,
          suggestedLabel: data.suggestedLabel || null,
          source: data.source || "assistant",
        },
      ]);
    } catch (error) {
      appendAssistantError(
        error.message || "تعذر الاتصال بالمساعد الذكي. تأكد من تشغيل الخادم."
      );
    } finally {
      setLoading(false);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    sendQuestion(input);
  };

  const clearConversation = () => {
    setMessages([initialMessage]);

    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors.
    }
  };

  return (
    <>
      <form
        className="school-ai-search"
        onSubmit={(event) => {
          event.preventDefault();

          if (input.trim()) sendQuestion(input);
          else setOpen(true);
        }}
        role="search"
      >
        <button
          type="button"
          className="school-ai-badge"
          onClick={() => setOpen(true)}
          aria-label="فتح مساعد مدرسة الكوفة الذكي"
          title="مساعد مدرسة الكوفة الذكي"
        >
          <img
            src="/ai-assistant-icon.png"
            alt=""
            className="school-ai-icon-image"
            aria-hidden="true"
          />
        </button>

        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="اسأل المساعد..."
          aria-label="اسأل مساعد مدرسة الكوفة الذكي"
        />

        <button
          type="submit"
          className="school-ai-send-mini"
          aria-label="إرسال السؤال"
          title="إرسال"
        >
          ←
        </button>
      </form>

      {open &&
        createPortal(
          <div className="school-ai-layer" dir="rtl">
            <button
              type="button"
              className="school-ai-backdrop"
              onClick={() => setOpen(false)}
              aria-label="إغلاق المساعد"
            />

            <section
              className="school-ai-panel"
              role="dialog"
              aria-modal="true"
              aria-label="مساعد مدرسة الكوفة الذكي"
            >
              <header className="school-ai-header">
                <div className="school-ai-title">
                  <span className="school-ai-orb" aria-hidden="true">
                    <img
                      src="/ai-assistant-icon.png"
                      alt=""
                      className="school-ai-icon-image"
                    />
                  </span>

                  <div className="school-ai-title-copy">
                    <strong>مساعد مدرسة الكوفة الذكي</strong>
                    <small>
                      مساعد ذكي لفهم البرنامج والوصول السريع إلى أقسامه وبياناته
                    </small>

                    <div className="school-ai-meta">
                      <span
                        className={`school-ai-status ${
                          health?.configured === false ? "offline" : ""
                        }`}
                      >
                        <i aria-hidden="true" />
                        {health?.configured === false
                          ? "Gemini غير متصل"
                          : "Gemini متصل"}
                      </span>

                      <span className="school-ai-mode">
                        دليل البرنامج + المساعد الذكي
                      </span>
                    </div>
                  </div>
                </div>

                <div className="school-ai-header-actions">
                  <button
                    type="button"
                    className="school-ai-clear"
                    onClick={clearConversation}
                  >
                    مسح المحادثة
                  </button>

                  <button
                    type="button"
                    className="school-ai-close"
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق"
                  >
                    ×
                  </button>
                </div>
              </header>

              <div className={`school-ai-quick ${quickOpen ? "open" : ""}`}>
                <div className="school-ai-quick-bar">
                  <div className="school-ai-quick-title">
                    <strong>اقتراحات سريعة</strong>
                    <span>أسئلة جاهزة تساعدك على البدء</span>
                  </div>

                  <button
                    type="button"
                    className="school-ai-quick-toggle"
                    onClick={() => setQuickOpen((current) => !current)}
                    aria-expanded={quickOpen}
                  >
                    {quickOpen ? "إخفاء" : "عرض الاقتراحات"}
                    <span aria-hidden="true">{quickOpen ? "↑" : "↓"}</span>
                  </button>
                </div>

                {quickOpen && (
                  <div className="school-ai-chips">
                    {ASSISTANT_QUICK_QUESTIONS.slice(0, 6).map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => {
                          setQuickOpen(false);
                          sendQuestion(question);
                        }}
                        disabled={loading}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="school-ai-chat" aria-live="polite">
                {messages.map((message) => (
                  <article
                    key={message.id}
                    className={`school-ai-message ${message.role} ${
                      message.isError ? "error" : ""
                    }`}
                  >
                    <span className="school-ai-message-author">
                      {message.role === "assistant" ? "مساعد مدرسة الكوفة الذكي" : "أنت"}
                    </span>

                    {message.role === "assistant" ? (
                      <AssistantMessageContent content={message.content} />
                    ) : (
                      <p className="school-ai-user-content">{message.content}</p>
                    )}

                    {message.suggestedPath && (
                      <button
                        type="button"
                        className="school-ai-open-page"
                        onClick={() => {
                          setOpen(false);
                          onNavigate?.(message.suggestedPath);
                        }}
                      >
                        فتح {message.suggestedLabel || "الصفحة"} ←
                      </button>
                    )}
                  </article>
                ))}

                {loading && (
                  <article className="school-ai-message assistant typing">
                    <span className="school-ai-message-author">مساعد مدرسة الكوفة الذكي</span>

                    <div className="school-ai-dots" aria-label="جاري كتابة الرد">
                      <i />
                      <i />
                      <i />
                    </div>
                  </article>
                )}

                <div ref={chatEndRef} />
              </div>

              <div className="school-ai-shortcuts">
                {ASSISTANT_SECTIONS.slice(0, 6).map((section) => (
                  <button
                    key={section.path}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.(section.path);
                    }}
                  >
                    {section.label}
                  </button>
                ))}
              </div>

              <form className="school-ai-composer" onSubmit={submit}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      !event.shiftKey &&
                      !event.nativeEvent.isComposing
                    ) {
                      event.preventDefault();
                      sendQuestion(input);
                    }
                  }}
                  rows="2"
                  maxLength="2400"
                  placeholder="اكتب سؤالك عن البرنامج..."
                />

                <button type="submit" disabled={loading || !input.trim()}>
                  {loading ? "..." : "إرسال"}
                </button>
              </form>

              <footer className="school-ai-footer">
                يشرح ويجيب ويقرأ الإحصائيات المرسلة من لوحة التحكم، ولا ينفذ
                حذفًا أو تعديلًا تلقائيًا.
              </footer>
            </section>
          </div>,
          document.body
        )}
    </>
  );
}