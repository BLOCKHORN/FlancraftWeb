import { Navigate, useLocation } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { hasMinRole } from "../../lib/auth/roles";

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

export default function ProtectedRoute({ children, requireAdmin = false, minRole = null }) {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  if (loading) return null;

  if (!user?.loggedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname, openLogin: true }} />;
  }

  const effectiveRole = normalizeRole(user?.rol_admin) || normalizeRole(user?.rango_staff);

  if (requireAdmin && !hasMinRole(effectiveRole, minRole || "owner")) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}