import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ROLE_HOME = {
  FARMER: "/farmer",
  BUYER: "/buyer",
  FPO: "/fpo",
  ADMIN: "/admin",
};

/** Gate a route behind login, completed registration, and (optionally) a specific role.
 * `role` may be a single role string or an array of allowed roles. */
export default function ProtectedRoute({ role, children }) {
  const { firebaseUser, role: myRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">Loading your account…</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!myRole) {
    return <Navigate to="/register" replace />;
  }

  const allowedRoles = role ? (Array.isArray(role) ? role : [role]) : null;
  if (allowedRoles && !allowedRoles.includes(myRole)) {
    return <Navigate to={ROLE_HOME[myRole] || "/home"} replace />;
  }

  return children;
}

export { ROLE_HOME };
