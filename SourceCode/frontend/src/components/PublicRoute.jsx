import { Navigate } from "react-router-dom";

export default function PublicRoute({ children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (token) {
    if (role === "PI") return <Navigate to="/pi-dashboard" replace />;
    if (role === "RND") return <Navigate to="/rnd-dashboard" replace />;
    if (role === "DORD") return <Navigate to="/DORD-dashboard" replace />;
    if (role === "DRRD") return <Navigate to="/DRRD-dashboard" replace />;
  }

  return children;
}
