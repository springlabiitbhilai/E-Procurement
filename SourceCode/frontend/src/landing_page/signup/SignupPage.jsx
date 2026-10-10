import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL, axiosInstance } from "../../config/api";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import CryptoJS from "crypto-js";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    employeeId: "",
    department: "",
    role: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Dynamic required validation
  const validate = () => {
    let newErrors = {};

    if (!form.fullName) newErrors.fullName = "Full Name is required";

    if (!form.email) {
      newErrors.email = "Email is required";
    } else if (!form.email.endsWith("@iitbhilai.ac.in")) {
      newErrors.email = "Email must end with @iitbhilai.ac.in";
    }

    if (!form.employeeId) newErrors.employeeId = "Employee ID is required";

    if (!form.department) newErrors.department = "Please select a department";

    if (!form.role) newErrors.role = "Please select a role";

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getPasswordChecks = (password) => {
    return {
      length: password.length >= 6,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({ ...form, [name]: value });

    // clear field error
    setErrors({ ...errors, [name]: "" });

    // clear global error
    setError("");

    // 🔥 real-time password check
    if (name === "password") {
      setPasswordChecks(getPasswordChecks(value));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      const hashedPassword = CryptoJS.SHA256(form.password).toString();

      const signupData = {
        ...form,
        password: hashedPassword,
        confirmPassword: hashedPassword,
      };
      const res = await axiosInstance.post(`/api/signup`, signupData);

      if (res.data.success) {
        localStorage.setItem("signupEmail", form.email);
        navigate("/generate-key");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Signup failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 bg-white/10 p-4 sm:p-6 rounded-2xl backdrop-blur-md shadow border border-white/20"
    >
      {error && <p className="text-red-500 bg-white/20 p-2 rounded">{error}</p>}

      <input
        name="fullName"
        type="text"
        placeholder="Full Name"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      />
      {errors.fullName && (
        <p className="text-red-500 text-sm">{errors.fullName}</p>
      )}

      <input
        name="email"
        type="email"
        placeholder="Email"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      />
      {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}

      <input
        name="employeeId"
        type="text"
        placeholder="Employee ID"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      />
      {errors.employeeId && (
        <p className="text-red-500 text-sm">{errors.employeeId}</p>
      )}

      <select
        name="department"
        onChange={handleChange}
        className="w-full p-2 rounded-lg bg-white text-black outline-none"
      >
        <option value="">Select Department</option>
        <option>CSE</option>
        <option>ECE</option>
        <option>Mechanical</option>
        <option>Civil</option>
        <option>Electrical</option>
        <option>R&D Department</option>
      </select>
      {errors.department && (
        <p className="text-red-500 text-sm">{errors.department}</p>
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
      {errors.role && <p className="text-red-500 text-sm">{errors.role}</p>}

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
      {form.password && (
        <div className="text-xs mt-2 space-y-1 text-red-500">
          {!passwordChecks.length && <p>✖ At least 6 characters</p>}

          {!passwordChecks.uppercase && <p>✖ 1 uppercase letter</p>}

          {!passwordChecks.lowercase && <p>✖ 1 lowercase letter</p>}

          {!passwordChecks.number && <p>✖ 1 number</p>}

          {!passwordChecks.special && <p>✖ 1 special character</p>}
        </div>
      )}

      <div className="relative">
        <input
          name="confirmPassword"
          type={showConfirmPassword ? "text" : "password"}
          placeholder="Confrm Password"
          onChange={handleChange}
          className="w-full p-2 rounded-lg bg-white text-black outline-none pr-10"
        />

        {/* Eye Button */}
        <span
          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          className="absolute right-3 top-2 cursor-pointer text-gray-600"
        >
          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
        </span>
      </div>
      {errors.confirmPassword && (
        <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
      )}

      <button className="w-full bg-[var(--primaryAccent)] hover:bg-[var(--primaryAccent)]/70 text-white py-2 rounded-lg font-semibold mt-2">
        Continue → Generate Keys
      </button>
    </form>
  );
}
