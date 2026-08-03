import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Login.css";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <h1>مدرسة الكوفة الأهلية</h1>
          <p>نظام الإدارة المدرسية الذكي</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>اسم المستخدم</label>
            <input
              type="text"
              placeholder="أدخل اسم المستخدم"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>كلمة المرور</label>
            <input
              type="password"
              placeholder="أدخل كلمة المرور"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="login-btn">
            تسجيل الدخول
          </button>

          <button
            type="button"
            className="login-btn"
            style={{ marginTop: "10px", background: "#666" }}
            onClick={() => navigate("/dashboard")}
          >
            تخطي تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  );
}