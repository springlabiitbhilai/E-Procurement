import React from "react";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, axiosInstance } from "../../config/api";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import CryptoJS from "crypto-js";

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
    setError("");
  };

  const validate = () => {
    let newErrors = {};

    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!form.email.endsWith("@iitbhilai.ac.in")) {
      newErrors.email = "Email must end with @iitbhilai.ac.in";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    }

    if (!form.role) {
      newErrors.role = "Please select a role";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔴 Required validation
    if (!validate()) return;

    try {
      setLoading(true);
      const hashedPassword = CryptoJS.SHA256(form.password).toString();

      const res = await axiosInstance.post(`/api/login`, {
        ...form,
        password: hashedPassword,
      });

      // ✅ Save token
      localStorage.setItem("token", res.data.token);

      localStorage.setItem("role", res.data.user.role);
      localStorage.setItem("name", res.data.user.fullName);

      // ✅ Role-based dashboard redirect
      if (res.data.user.role === "PI") navigate("/pi-dashboard");
      else if (res.data.user.role === "RND") navigate("/rnd-dashboard");
      else if (res.data.user.role === "DORD") navigate("/DORD-dashboard");
      else if (res.data.user.role === "DRRD") navigate("/DRRD-dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-white/10 p-4 sm:p-6 rounded-2xl backdrop-blur-md shadow border border-white/20"
    >
      {error && <p className="text-red-400 bg-white/20 p-2 rounded">{error}</p>}

      <input
        type="email"
        name="email"
        placeholder="Email"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      />
      {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}

      <div className="relative">
        <input
          name="password"
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          onChange={handleChange}
          className="w-full p-2 rounded-lg bg-white text-black outline-none pr-10"
        />

        {/* Eye Button */}
        <span
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-2 cursor-pointer text-gray-600"
        >
          {showPassword ? <FaEyeSlash /> : <FaEye />}
        </span>
      </div>
      {errors.password && (
        <p className="text-red-400 text-sm">{errors.password}</p>
      )}

      <select
        name="role"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      >
        <option value="">Select Role</option>
        <option value="PI">PI (Principal Investigator)</option>
        <option value="DORD">DORD (Dean of R&D)</option>
        <option value="DRRD">DRRD (Deputy Registrar of R&D)</option>
        <option value="RND">RND (Research and Development)</option>
      </select>
      {errors.role && <p className="text-red-400 text-sm">{errors.role}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[var(--primaryAccent)] hover:bg-[var(--primaryAccent)]/80 text-white py-2 rounded-lg font-semibold mt-2"
      >
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
