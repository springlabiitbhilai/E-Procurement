// src/Footer.jsx
import { useLocation } from "react-router-dom";

function Footer() {
  const { pathname } = useLocation();

  // The login page has its own footer line inside the full-screen layout
  if (pathname === "/") return null;

  return (
    <footer className="px-4 sm:px-6 py-3 text-center">
      <small className="text-[11px] sm:text-xs leading-snug">
        © {new Date().getFullYear()} HOD Office, CSE, IIT Bhilai | Procure
        Management System
      </small>
    </footer>
  );
}

export default Footer;
