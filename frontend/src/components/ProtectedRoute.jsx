import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

const ROLE_HOME = {
  FARMER: "/farmer/profile",
  BUYER: "/buyer",
  FPO: "/fpo",
  ADMIN: "/admin",
};

/** Gate a route behind login, completed registration, and (optionally) a specific role.
 * `role` may be a single role string or an array of allowed roles. */
export default function ProtectedRoute({ role, children }) {
  const { t } = useLanguage();
  const { firebaseUser, role: myRole, loading, syncError, refresh } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="p-10 text-center text-sm text-gray-500">{t("Loading your account…")}</div>;
  }

  if (!firebaseUser) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // A signed-in user with no role is normally mid-registration — but if the last
  // /auth/me call failed for a reason other than "you're not authenticated" (backend
  // restarting, a network blip, Firebase token verification briefly unavailable), that
  // is not proof the account is unregistered. Offer a retry instead of routing an
  // already-registered user straight back into the registration form.
  if (!myRole && syncError) {
    return (
      <div className="p-10 text-center text-sm text-gray-600 space-y-3">
        <p>{t("Couldn't confirm your account just now. This is usually temporary.")}</p>
        <button
          type="button"
          onClick={() => refresh()}
          className="inline-action"
        >
          {t("Try again")}
        </button>
      </div>
    );
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
