import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CryptoJS from "crypto-js";
import { axiosInstance } from "../../config/api";
import {
  TextField,
  PasswordField,
  SelectField,
  FormAlert,
  SubmitButton,
  ROLE_OPTIONS,
} from "../../components/AuthFields";

const DASHBOARDS = {
  PI: "/pi-dashboard",
  RND: "/rnd-dashboard",
  DORD: "/DORD-dashboard",
  DRRD: "/DRRD-dashboard",
  MEDIA_CELL: "/media-cell-dashboard"
};

export default function LoginPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
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

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!email.endsWith("@iitbhilai.ac.in")) {
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

    if (loading || !validate()) return;

    try {
      setLoading(true);

      // The password is hashed in the browser before it is sent
      const hashedPassword = CryptoJS.SHA256(form.password).toString();

      const res = await axiosInstance.post(`/api/login`, {
        ...form,
        email: form.email.trim(),
        password: hashedPassword,
      });

      const { token, user } = res.data;

      localStorage.setItem("token", token);
      localStorage.setItem("role", user.role);
      localStorage.setItem("name", user.fullName);

      navigate(DASHBOARDS[user.role] || "/");
    } catch (err) {
      console.error(err);

      if (err.response) {
        setError(err.response.data?.message || "Login failed");
      } else if (err.request) {
        setError(
          "Cannot reach the server. Check your connection and try again.",
        );
      } else {
        setError("Login failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="auth-form">
      {error && <FormAlert>{error}</FormAlert>}

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

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        placeholder="Enter your password"
        value={form.password}
        onChange={handleChange}
        error={errors.password}
      />

      <SelectField
        label="Role"
        name="role"
        value={form.role}
        onChange={handleChange}
        error={errors.role}
        hint="Choose the desk you are logging in to."
      >
        <option value="">Select role</option>
        {ROLE_OPTIONS.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </SelectField>

      <div className="auth-submit">
        <SubmitButton loading={loading} loadingText="Logging in...">
          Login
        </SubmitButton>
      </div>
    </form>
  );
}
