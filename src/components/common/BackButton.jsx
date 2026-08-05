import "./BackButton.css";

export default function BackButton({ onClick }) {
  return (
    <button
      type="button"
      className="app-back-button"
      onClick={onClick}
      aria-label="الرجوع إلى الصفحة السابقة"
    >
      <span aria-hidden="true">←</span>
      رجوع
    </button>
  );
}
