import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { hasMinRole } from "../../lib/auth/roles";


export default function ProtectedRoute({ children, requireAdmin = false, minRole = null }) {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) return null;
  if (!user?.loggedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname, openLogin: true }} />;
  }

  if (requireAdmin && !hasMinRole(user?.rol_admin, minRole || "owner")) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
