import { Navigate, useLocation } from "react-router-dom";
import { useContext, useMemo } from "react";
import { UserContext } from "../../context/UserContext";
import { hasMinRole } from "../../lib/auth/roles";

const normalizeRole = (value) => {
  if (value === null || value === undefined) return null;
  const role = String(value).trim().toLowerCase().replace(/[\s_-]+/g, "");
  return role || null;
};

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  minRole = null,
}) {
  const { user, loading } = useContext(UserContext);
  const location = useLocation();

  const effectiveRole = useMemo(
    () => normalizeRole(user?.rango_staff || user?.rol_admin),
    [user]
  );

  if (loading) return null;

  if (!user?.loggedIn) {
    return <Navigate to="/" replace state={{ from: location.pathname, openLogin: true }} />;
  }

  const requiredRole = minRole || (requireAdmin ? "owner" : null);

  if (requiredRole && !hasMinRole(effectiveRole, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}