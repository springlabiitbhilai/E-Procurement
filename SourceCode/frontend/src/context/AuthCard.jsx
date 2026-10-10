import React, { useState } from "react";
import LoginPage from "../landing_page/login/LoginPage";
import SignupPage from "../landing_page/signup/SignupPage";

export default function AuthCard() {
  const [tab, setTab] = useState("signup");

  return (
    <div className="bg-white/25 backdrop-blur-xl shadow-xl rounded-2xl p-4 sm:p-6 w-full max-w-[380px] max-h-[90vh] overflow-y-auto no-scrollbar">
      {/* Tabs */}
      <div className="flex mb-4 bg-white/20 p-1 rounded-xl">
        <button
          onClick={() => setTab("signup")}
          className={`w-1/2 py-2 rounded-lg font-semibold ${
            tab === "signup" ? "bg-white text-blue-600" : "text-white"
          }`}
        >
          Signup
        </button>

        <button
          onClick={() => setTab("login")}
          className={`w-1/2 py-2 rounded-lg font-semibold ${
            tab === "login" ? "bg-white text-blue-600" : "text-white"
          }`}
        >
          Login
        </button>
      </div>

      {/* Render Forms */}
      {tab === "signup" ? <SignupPage /> : <LoginPage />}
    </div>
  );
}
