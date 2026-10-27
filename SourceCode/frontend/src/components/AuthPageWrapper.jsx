import AuthCard from "../context/AuthCard";
import { Icon } from "./Icons";
import campus from "../../assets/iitbhilai1.jpg";
import "../navbar.css";
import "../auth.css";

const FEATURES = [
  {
    icon: "shield",
    title: "Digitally signed",
    text: "Every approval carries the signer's own key and is verified at the next desk.",
  },
  {
    icon: "trend",
    title: "Live fund tracking",
    text: "See balances and blocked funds before you decide.",
  },
  {
    icon: "users",
    title: "One shared workflow",
    text: "PI, DRRD, R&D and the Dean work on a single record.",
  },
];

function AuthPageWrapper() {
  return (
    <div className="auth-page">
      <div className="auth-bg" aria-hidden="true">
        <img src={campus} alt="" />
      </div>

      <div className="auth-shell">
        <section className="auth-hero">
          <p className="auth-eyebrow auth-rise" style={{ "--d": "0s" }}>
            <span className="auth-eyebrow-dot" aria-hidden="true" />
            R&amp;D Process Management System
          </p>

          <h1 className="auth-headline auth-rise" style={{ "--d": "0.08s" }}>
            Every R&amp;D approval, <em>signed and traceable.</em>
          </h1>

          <p className="auth-lead auth-rise" style={{ "--d": "0.16s" }}>
            Register projects, book funds and approve recruitment requests
            across every desk, with each step digitally signed.
          </p>

          <ul className="auth-features auth-rise" style={{ "--d": "0.24s" }}>
            {FEATURES.map((feature) => (
              <li key={feature.title} className="auth-feature">
                <span className="auth-feature-icon">
                  <Icon name={feature.icon} size={20} />
                </span>

                <div>
                  <p className="auth-feature-title">{feature.title}</p>
                  <p className="auth-feature-text">{feature.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-side">
          <AuthCard />
        </section>
      </div>

      <p className="auth-copyright">
        © {new Date().getFullYear()} HOD Office, CSE, IIT Bhilai | E-Procura
      </p>
    </div>
  );
}

export default AuthPageWrapper;
