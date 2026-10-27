import { useId, useState } from "react";
import { Icon } from "./Icons";

// Shared form pieces for the login and signup pages.
// Styles live in src/auth.css (classes starting with "auth-").

export const ROLE_OPTIONS = [
  { value: "PI", label: "PI (Principal Investigator)" },
  { value: "DORD", label: "DORD (Dean of R&D)" },
  { value: "DRRD", label: "DRRD (Deputy Registrar of R&D)" },
  { value: "RND", label: "RND (Research and Development)" },
  { value: "MEDIA_CELL", label: "Media Cell" },
];

// The icon in each field is chosen from the field's name
const FIELD_ICONS = {
  email: "mail",
  password: "lock",
  confirmPassword: "lock",
  fullName: "user",
  employeeId: "id",
  department: "building",
  role: "briefcase",
};

function Field({ id, label, error, hint, children }) {
  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>

      {children}

      {error ? (
        <p id={`${id}-note`} role="alert" className="auth-note is-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-note`} className="auth-note">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const describedBy = (id, error, hint) =>
  error || hint ? `${id}-note` : undefined;

export function TextField({ label, error, hint, ...props }) {
  const id = useId();
  const icon = FIELD_ICONS[props.name];

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="auth-control">
        {icon && <Icon name={icon} className="auth-control-icon" />}

        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={`auth-input ${icon ? "has-icon" : ""} ${
            error ? "has-error" : ""
          }`}
          {...props}
        />
      </div>
    </Field>
  );
}

export function PasswordField({ label, error, hint, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const icon = FIELD_ICONS[props.name];

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="auth-control">
        {icon && <Icon name={icon} className="auth-control-icon" />}

        <input
          id={id}
          type={visible ? "text" : "password"}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={`auth-input has-toggle ${icon ? "has-icon" : ""} ${
            error ? "has-error" : ""
          }`}
          {...props}
        />

        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="auth-toggle"
        >
          <Icon name={visible ? "eye-off" : "eye"} size={18} />
        </button>
      </div>
    </Field>
  );
}

export function SelectField({ label, error, hint, children, ...props }) {
  const id = useId();
  const icon = FIELD_ICONS[props.name];

  return (
    <Field id={id} label={label} error={error} hint={hint}>
      <div className="auth-control">
        {icon && <Icon name={icon} className="auth-control-icon" />}

        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy(id, error, hint)}
          className={`auth-input auth-select ${icon ? "has-icon" : ""} ${
            error ? "has-error" : ""
          } ${props.value ? "" : "is-empty"}`}
          {...props}
        >
          {children}
        </select>

        <Icon name="chevron" size={16} className="auth-select-chevron" />
      </div>
    </Field>
  );
}

export function FormAlert({ children }) {
  return (
    <div role="alert" className="auth-alert">
      <Icon name="alert" size={18} />
      <span>{children}</span>
    </div>
  );
}

export function SubmitButton({ loading, loadingText, children }) {
  return (
    <button type="submit" disabled={loading} className="auth-btn">
      {loading ? (
        <>
          <span aria-hidden="true" className="auth-spinner" />
          {loadingText}
        </>
      ) : (
        <>
          {children}
          <Icon name="arrow" size={18} className="auth-btn-arrow" />
        </>
      )}
    </button>
  );
}
