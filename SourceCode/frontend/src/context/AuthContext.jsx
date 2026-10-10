import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Load from localStorage when app starts
  useEffect(() => {
    const savedRole = localStorage.getItem("role");
    const savedEmail = localStorage.getItem("email");

    if (savedRole && savedEmail) {
      setUser({ role: savedRole, email: savedEmail });
    }
  }, []);

  // NOW login expects role + email
  const login = (role, email) => {
    localStorage.setItem("role", role);
    localStorage.setItem("email", email);

    setUser({ role, email });

    navigate("/dashboard");
  };

  const logout = () => {
    localStorage.removeItem("role");
    localStorage.removeItem("email");

    setUser(null);
    navigate("/");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => useContext(AuthContext);