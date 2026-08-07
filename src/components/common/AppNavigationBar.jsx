import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./AppNavigationBar.css";

const THEME_STORAGE_KEYS = ["theme", "alkufa-theme"];

const getSavedTheme = () => {
  const storedTheme = THEME_STORAGE_KEYS.map((key) =>
    window.localStorage.getItem(key)
  ).find((value) => value === "dark" || value === "light");

  if (storedTheme) {
    return storedTheme;
  }

  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
};

const isEditableTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
};

export default function AppNavigationBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(getSavedTheme);

  const isLogin = location.pathname === "/";
  const isDashboard = location.pathname === "/dashboard";
  const isHidden = isLogin || isDashboard;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    THEME_STORAGE_KEYS.forEach((key) => {
      window.localStorage.setItem(key, theme);
    });
  }, [theme]);

  const goBack = () => {
    const historyIndex = Number(window.history.state?.idx);

    if (Number.isFinite(historyIndex) && historyIndex > 0) {
      navigate(-1);
      return;
    }

    navigate("/dashboard");
  };

  useEffect(() => {
    if (isHidden) {
      return undefined;
    }

    const handleBackspace = (event) => {
      if (event.key !== "Backspace" || isEditableTarget(event.target)) {
        return;
      }

      event.preventDefault();
      goBack();
    };

    window.addEventListener("keydown", handleBackspace);
    return () => window.removeEventListener("keydown", handleBackspace);
  }, [isHidden, location.key]);

  if (isHidden) {
    return null;
  }

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  return (
    <nav className="app-navigation-bar print-hide" aria-label="التنقل العام">
      <button
        type="button"
        className="app-navigation-theme-button"
        onClick={toggleTheme}
        aria-label={
          theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الداكن"
        }
        title={theme === "dark" ? "الوضع الفاتح" : "الوضع الداكن"}
        aria-pressed={theme === "dark"}
      >
        <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
      </button>

      <button
        type="button"
        className="app-navigation-back-button"
        onClick={goBack}
        aria-label="الرجوع إلى الصفحة السابقة"
        title="رجوع"
      >
        <span aria-hidden="true">←</span>
        <strong>رجوع</strong>
      </button>
    </nav>
  );
}