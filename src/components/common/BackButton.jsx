import { useLocation, useNavigate } from "react-router-dom";
import "./BackButton.css";

export default function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/dashboard", { replace: true });
  };

  if (location.pathname === "/" || location.pathname === "/dashboard") {
    return null;
  }

  return (
    <button
      type="button"
      className="app-back-button"
      onClick={handleBack}
      aria-label="الرجوع إلى الصفحة السابقة"
    >
      <span aria-hidden="true">←</span>
      رجوع
    </button>
  );
}