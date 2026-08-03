import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

function forceLightMode() {
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.classList.remove("dark-mode");
  document.body.classList.remove("dark-mode");
  localStorage.setItem("theme", "light");
}

forceLightMode();

const themeObserver = new MutationObserver(() => {
  const isDark =
    document.documentElement.getAttribute("data-theme") === "dark" ||
    document.documentElement.classList.contains("dark-mode") ||
    document.body.classList.contains("dark-mode");

  if (isDark) {
    forceLightMode();
  }
});

themeObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["data-theme", "class"],
});

themeObserver.observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);