import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Icon } from "./components/Icons";
import logo from "../assets/spring_lab.png";
import "./navbar.css";

const DASHBOARD_LINKS = {
  PI: { to: "/pi-dashboard", label: "PI Dashboard" },
  RND: { to: "/rnd-dashboard", label: "R&D Dashboard" },
  DORD: { to: "/DORD-dashboard", label: "DORD Dashboard" },
  DRRD: { to: "/DRRD-dashboard", label: "DRRD Dashboard" },
};

function NavBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");

  // On the login page the bar floats over the campus photo
  const overlay = pathname === "/" && !token;

  const dashboard = DASHBOARD_LINKS[role];

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  // Same items for the desktop bar and the mobile menu
  const items = token ? (
    <>
      {dashboard && (
        <Link
          to={dashboard.to}
          onClick={closeMenu}
          className={`nav-link ${pathname === dashboard.to ? "is-active" : ""}`}
        >
          {dashboard.label}
        </Link>
      )}

      <span className="nav-user">
        <span className="nav-avatar" aria-hidden="true">
          {(name || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="nav-user-name">{name}</span>
        <span className="nav-role">{role}</span>
      </span>

      <button
        type="button"
        onClick={() => {
          closeMenu();
          handleLogout();
        }}
        className="nav-logout"
      >
        <Icon name="logout" size={16} />
        Logout
      </button>
    </>
  ) : (
    <Link to="/" onClick={closeMenu} className="nav-cta">
      Login / Sign up
    </Link>
  );

  return (
    <header className={`nav ${overlay ? "nav--overlay" : ""}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-brand" onClick={closeMenu}>
          <img src={logo} alt="SPrIng Lab logo" className="nav-logo" />

          <span className="nav-brand-text">
            <span className="nav-brand-name">E-Procura</span>
            <span className="nav-brand-tag">A SPrInG Lab product</span>
          </span>
        </Link>

        {overlay ? (
          <p className="nav-institute">Indian Institute of Technology Bhilai</p>
        ) : (
          <>
            <nav className="nav-desktop" aria-label="Main">
              {items}
            </nav>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="nav-toggle"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <Icon name={menuOpen ? "close" : "menu"} size={22} />
            </button>
          </>
        )}
      </div>

      {/* Mobile menu */}
      {!overlay && menuOpen && (
        <nav className="nav-mobile" aria-label="Mobile">
          {items}
        </nav>
      )}
    </header>
  );
}

export default NavBar;
