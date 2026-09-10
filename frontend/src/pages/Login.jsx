import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { auth, getFirebaseAuthError } from "../firebase.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const { firebaseUser, role, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.sessionExpired || "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || !firebaseUser) return;
    navigate(role ? ROLE_HOME[role] || "/home" : "/register", { replace: true });
  }, [loading, firebaseUser, role, navigate]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await signInWithEmailAndPassword(auth, email.trim(), password);
      const me = await refresh();
      navigate(me?.role ? ROLE_HOME[me.role] || "/home" : "/register", { replace: true });
    } catch (loginError) {
      console.error("[KisanSetu] Login failed:", loginError?.code, loginError);
      setError(getFirebaseAuthError(loginError));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email above first, then click \"Forgot password\".");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(`Password reset link sent to ${email}.`);
    } catch (resetError) {
      console.error("[KisanSetu] Password reset failed:", resetError?.code, resetError);
      setError(getFirebaseAuthError(resetError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-wash" aria-hidden="true" />
      <section className="login-panel" aria-label="Login credentials">
        <div className="login-language-picker">
          <label htmlFor="login-language">{t("login.language")}</label>
          <select id="login-language" value={lang} onChange={(event) => setLang(event.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
        {error && <p className="registration-message error" role="alert">{error}</p>}
        {message && <output className="registration-message success">{message}</output>}
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
          <button className="login-button" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Log in"} <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="text-action" onClick={handleForgotPassword} disabled={busy}>
            Forgot password?
          </button>
        </form>
        <p className="login-register-prompt">
          {t("login.newUser")} <Link to="/register">{t("login.createAccount")}</Link>
        </p>
      </section>
    </main>
  );
}
