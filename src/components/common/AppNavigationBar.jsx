import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import "./AppNavigationBar.css";

const getInitialTheme = () => {
  const savedTheme =
    window.localStorage.getItem("theme") ||
    window.localStorage.getItem("alkufa-theme");

  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
};

export default function AppNavigationBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getInitialTheme);

  const isLoginPage = location.pathname === "/";
  const isDashboardPage = location.pathname === "/dashboard";
  const showGlobalControls = !isLoginPage && !isDashboardPage;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("theme", theme);
    window.localStorage.setItem("alkufa-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!showGlobalControls) return undefined;

    const handleBackspace = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();

      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (event.key === "Backspace" && !isTyping) {
        event.preventDefault();

        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleBackspace);
    return () => window.removeEventListener("keydown", handleBackspace);
  }, [navigate, showGlobalControls]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/dashboard");
  };

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "dark" ? "light" : "dark"
    );
  };

  if (!showGlobalControls || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="app-global-navigation-layer" dir="rtl">
      <button
        type="button"
        className="app-navigation-theme-button"
        onClick={toggleTheme}
        aria-label={
          theme === "dark"
            ? "التبديل إلى الوضع الفاتح"
            : "التبديل إلى الوضع الداكن"
        }
        title={
          theme === "dark"
            ? "الوضع الفاتح"
            : "الوضع الداكن"
        }
      >
        <span aria-hidden="true">
          {theme === "dark" ? "☀" : "☾"}
        </span>
      </button>

      <button
        type="button"
        className="app-navigation-back-button"
        onClick={handleBack}
        aria-label="رجوع"
        title="رجوع"
      >
        <span aria-hidden="true">↩</span>
        <strong>رجوع</strong>
      </button>
    </div>,
    document.body
  );
}