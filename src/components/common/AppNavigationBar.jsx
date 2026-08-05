import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import BackButton from "./BackButton";
import "./AppNavigationBar.css";

const THEME_STORAGE_KEY = "alkufa-theme";
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
const OPEN_DIALOG_SELECTOR =
  '[role="dialog"], [aria-modal="true"], .modal-sticky-close';

const getSavedTheme = () =>
  localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";

const isEditableTarget = (target) =>
  target instanceof Element && Boolean(target.closest(EDITABLE_SELECTOR));

export default function AppNavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationLockedRef = useRef(false);
  const hasPendingEditsRef = useRef(false);
  const unlockTimerRef = useRef(null);
  const [theme, setTheme] = useState(getSavedTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    hasPendingEditsRef.current = false;
  }, [location.key]);

  useEffect(() => {
    const markPendingEdits = (event) => {
      const dialogOpen = Boolean(
        document.querySelector(OPEN_DIALOG_SELECTOR)
      );

      if (isEditableTarget(event.target) && !dialogOpen) {
        hasPendingEditsRef.current = true;
      }
    };

    const clearPendingEdits = () => {
      hasPendingEditsRef.current = false;
    };

    document.addEventListener("input", markPendingEdits, true);
    document.addEventListener("change", markPendingEdits, true);
    document.addEventListener("submit", clearPendingEdits, true);
    document.addEventListener("reset", clearPendingEdits, true);

    return () => {
      document.removeEventListener("input", markPendingEdits, true);
      document.removeEventListener("change", markPendingEdits, true);
      document.removeEventListener("submit", clearPendingEdits, true);
      document.removeEventListener("reset", clearPendingEdits, true);
    };
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(unlockTimerRef.current);
    },
    []
  );

  const navigateBack = useCallback(() => {
    if (navigationLockedRef.current) return;

    navigationLockedRef.current = true;

    const historyIndex = Number(window.history.state?.idx);

    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1);
    } else if (location.pathname !== "/dashboard") {
      navigate("/dashboard", { replace: true });
    }

    unlockTimerRef.current = window.setTimeout(() => {
      navigationLockedRef.current = false;
    }, 350);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleBackspace = (event) => {
      if (
        event.key !== "Backspace" ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey
      ) {
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      const dialogOpen = Boolean(
        document.querySelector(OPEN_DIALOG_SELECTOR)
      );

      if (dialogOpen || hasPendingEditsRef.current) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      navigateBack();
    };

    window.addEventListener("keydown", handleBackspace, true);

    return () => {
      window.removeEventListener("keydown", handleBackspace, true);
    };
  }, [navigateBack]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  };

  return (
    <nav className="app-navigation-bar" aria-label="التنقل العام">
      <BackButton onClick={navigateBack} />

      <button
        type="button"
        className="app-theme-toggle"
        onClick={toggleTheme}
        aria-label={
          theme === "light" ? "تفعيل الوضع الداكن" : "تفعيل الوضع الفاتح"
        }
        title={theme === "light" ? "الوضع الداكن" : "الوضع الفاتح"}
        aria-pressed={theme === "dark"}
      >
        <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
      </button>
    </nav>
  );
}
