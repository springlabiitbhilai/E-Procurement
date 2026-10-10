import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { FaBars, FaTimes } from "react-icons/fa";
import logo from "../assets/spring_lab.png";

function NavBar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");

  const handleLogout = () => {
    localStorage.clear();
    navigate("/", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="bg-[var(--primaryAccent)] text-white px-4 sm:px-6 py-3 shadow-md">
      <div className="flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2" onClick={closeMenu}>
          <img
            src={logo}
            alt="SPring Labs Logo"
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full"
          />

          <div className="flex flex-col leading-tight">
            <span className="text-lg sm:text-xl md:text-2xl font-bold">
              E-Procura
            </span>
            <span className="text-[10px] sm:text-xs text-white/80">
              A SPrIng Lab product
            </span>
          </div>
        </Link>

        {/* Desktop menu (md and up) */}
        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {token ? (
            <>
              {role === "PI" && (
                <Link to="/pi-dashboard" className="hover:underline">
                  PI Dashboard
                </Link>
              )}

              {role === "RND" && (
                <Link to="/rnd-dashboard" className="hover:underline">
                  R&D Dashboard
                </Link>
              )}

              {role === "DORD" && (
                <Link to="/DORD-dashboard" className="hover:underline">
                  DORD Dashboard
                </Link>
              )}

              {role === "DRRD" && (
                <Link to="/DRRD-dashboard" className="hover:underline">
                  DRRD Dashboard
                </Link>
              )}

              <span className="text-sm bg-white/20 px-3 py-1 rounded-lg">
                {name} ({role})
              </span>

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/" className="hover:underline">
              SignUp/Login
            </Link>
          )}
        </div>

        {/* Hamburger button (mobile only) */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 rounded-lg hover:bg-white/10"
          aria-label="Toggle menu"
        >
          {menuOpen ? <FaTimes size={22} /> : <FaBars size={22} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden mt-3 flex flex-col gap-3 pb-3 border-t border-white/10 pt-3">
          {token ? (
            <>
              {role === "PI" && (
                <Link
                  to="/pi-dashboard"
                  className="hover:underline"
                  onClick={closeMenu}
                >
                  PI Dashboard
                </Link>
              )}

              {role === "RND" && (
                <Link
                  to="/rnd-dashboard"
                  className="hover:underline"
                  onClick={closeMenu}
                >
                  R&D Dashboard
                </Link>
              )}

              {role === "DORD" && (
                <Link
                  to="/DORD-dashboard"
                  className="hover:underline"
                  onClick={closeMenu}
                >
                  DORD Dashboard
                </Link>
              )}

              {role === "DRRD" && (
                <Link
                  to="/DRRD-dashboard"
                  className="hover:underline"
                  onClick={closeMenu}
                >
                  DRRD Dashboard
                </Link>
              )}

              <span className="text-sm bg-white/20 px-3 py-1 rounded-lg w-fit">
                {name} ({role})
              </span>

              <button
                onClick={() => {
                  closeMenu();
                  handleLogout();
                }}
                className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm w-fit"
              >
                Logout
              </button>
            </>
          ) : (
            <Link to="/" className="hover:underline" onClick={closeMenu}>
              SignUp/Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

export default NavBar;
