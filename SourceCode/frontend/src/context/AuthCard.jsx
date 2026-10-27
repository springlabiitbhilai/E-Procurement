import { useState } from "react";
import LoginPage from "../landing_page/login/LoginPage";
import SignupPage from "../landing_page/signup/SignupPage";
import { Icon } from "../components/Icons";

const TABS = [
  { key: "login", label: "Login" },
  { key: "signup", label: "Sign up" },
];

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Use your IIT Bhilai email and the role you work in.",
    switchText: "New to E-Procura?",
    switchAction: "Create an account",
    switchTo: "signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Register with your IIT Bhilai email address.",
    switchText: "Already registered?",
    switchAction: "Login",
    switchTo: "login",
  },
};

export default function AuthCard() {
  const [tab, setTab] = useState("login");

  const copy = COPY[tab];

  return (
    <div
      className={`auth-card auth-rise ${tab === "signup" ? "is-signup" : ""}`}
      style={{ "--d": "0.1s" }}
    >
      <div className="auth-card-head">
        <span className="auth-card-badge">
          <Icon name="shield" size={22} />
        </span>

        <h2 className="auth-title">{copy.title}</h2>
      </div>

      <p className="auth-subtitle">{copy.subtitle}</p>

      {/* Tabs */}
      <div role="tablist" aria-label="Login or sign up" className="auth-tabs">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            id={`auth-tab-${item.key}`}
            aria-selected={tab === item.key}
            aria-controls="auth-panel"
            onClick={() => setTab(item.key)}
            className={`auth-tab ${tab === item.key ? "is-active" : ""}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div
        id="auth-panel"
        role="tabpanel"
        aria-labelledby={`auth-tab-${tab}`}
        className="auth-panel-body"
      >
        {tab === "signup" ? <SignupPage /> : <LoginPage />}
      </div>

      <p className="auth-switch">
        {copy.switchText}{" "}
        <button
          type="button"
          onClick={() => setTab(copy.switchTo)}
          className="auth-link"
        >
          {copy.switchAction}
        </button>
      </p>
    </div>
  );
}
