import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { axiosInstance } from "../../config/api";
import { Icon } from "../../components/Icons";
import {
  TextField,
  PasswordField,
  SelectField,
  FormAlert,
  SubmitButton,
  ROLE_OPTIONS,
} from "../../components/AuthFields";

const DEPARTMENTS = [
  "CSE",
  "ECE",
  "Mechanical",
  "Civil",
  "Electrical",
  "R&D Department",
  "ITIS",
];

const PASSWORD_RULES = [
  { key: "length", label: "6+ characters" },
  { key: "uppercase", label: "Uppercase" },
  { key: "lowercase", label: "Lowercase" },
  { key: "number", label: "Number" },
  { key: "special", label: "Symbol" },
];

const getPasswordChecks = (password) => ({
  length: password.length >= 6,
  uppercase: /[A-Z]/.test(password),
  lowercase: /[a-z]/.test(password),
  number: /[0-9]/.test(password),
  special: /[^A-Za-z0-9]/.test(password),
});

function PasswordChecklist({ checks }) {
  return (
    <ul aria-label="Password suggestions" className="auth-checklist">
      {PASSWORD_RULES.map(({ key, label }) => (
        <li key={key} className={`auth-check ${checks[key] ? "is-met" : ""}`}>
          {checks[key] ? (
            <Icon name="check-circle" size={16} />
          ) : (
            <Icon name="circle" size={16} />
          )}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

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
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const validate = () => {
    const newErrors = {};
    const email = form.email.trim();

    if (!form.fullName.trim()) newErrors.fullName = "Full name is required";

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!email.endsWith("@iitbhilai.ac.in")) {
      newErrors.email = "Email must end with @iitbhilai.ac.in";
    }

    if (!form.employeeId.trim())
      newErrors.employeeId = "Employee ID is required";

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading || !validate()) return;

    try {
      setLoading(true);

      // The password is hashed in the browser before it is sent
      const hashedPassword = CryptoJS.SHA256(form.password).toString();
      const email = form.email.trim();

      const res = await axiosInstance.post(`/api/signup`, {
        ...form,
        email,
        password: hashedPassword,
        confirmPassword: hashedPassword,
      });

      if (res.data.success) {
        // The next step (key generation) saves the public key for this email
        localStorage.setItem("signupEmail", email);
        localStorage.setItem("setupToken", res.data.setupToken);
        navigate("/generate-key");
      }
    } catch (err) {
      console.error(err);

      if (err.response) {
        setError(err.response.data?.message || "Signup failed");
      } else if (err.request) {
        setError(
          "Cannot reach the server. Check your connection and try again.",
        );
      } else {
        setError("Signup failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="auth-form">
      {error && <FormAlert>{error}</FormAlert>}

      <div className="auth-row">
        <TextField
          label="Full name"
          name="fullName"
          autoComplete="name"
          value={form.fullName}
          onChange={handleChange}
          error={errors.fullName}
        />

        <TextField
          label="Employee ID"
          name="employeeId"
          value={form.employeeId}
          onChange={handleChange}
          error={errors.employeeId}
        />
      </div>

      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="name@iitbhilai.ac.in"
        value={form.email}
        onChange={handleChange}
        error={errors.email}
      />

      <div className="auth-row">
        <SelectField
          label="Department"
          name="department"
          value={form.department}
          onChange={handleChange}
          error={errors.department}
        >
          <option value="">Select department</option>
          {DEPARTMENTS.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Role"
          name="role"
          value={form.role}
          onChange={handleChange}
          error={errors.role}
        >
          <option value="">Select role</option>
          {ROLE_OPTIONS.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="auth-pw-group">
        <div className="auth-row auth-row--pw">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
          />

          <PasswordField
            label="Confirm password"
            name="confirmPassword"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
          />
        </div>

        {form.password && (
          <PasswordChecklist checks={getPasswordChecks(form.password)} />
        )}
      </div>

      <div className="auth-submit">
        <SubmitButton loading={loading} loadingText="Creating account...">
          Create account
        </SubmitButton>
      </div>
    </form>
  );
}
