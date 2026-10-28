import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { auth, finishGoogleRedirect, getFirebaseAuthError, signInWithGoogle } from "../firebase.js";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t, languages } = useLanguage();
  const { firebaseUser, role, loading, refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.sessionExpired || "");
  const [message, setMessage] = useState("");
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (loading || !firebaseUser) return;
    if (role) navigate(ROLE_HOME[role] || "/home");
  }, [loading, firebaseUser, role, navigate]);

  // Where to go once Firebase has signed someone in: their dashboard, or onboarding if the
  // account has no role yet (first Google sign-in, or an unfinished registration).
  const routeSignedInUser = async () => {
    const me = await refresh();
    if (me?.role) {
      navigate(ROLE_HOME[me.role] || "/home");
    } else if (me) {
      navigate("/register");
    } else {
      setError(t("Signed in, but couldn't reach the server to load your account. Please try again."));
    }
  };

  // Finish a Google sign-in that fell back to a full-page redirect (popup was blocked).
  useEffect(() => {
    finishGoogleRedirect()
      .then((user) => user && routeSignedInUser())
      .catch((redirectError) => setError(t(getFirebaseAuthError(redirectError))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    try {
      setGoogleBusy(true);
      setError("");
      setMessage("");
      const user = await signInWithGoogle();
      if (user) await routeSignedInUser();
    } catch (googleError) {
      console.error("[KisanSetu] Google sign-in failed:", googleError?.code, googleError);
      setError(t(getFirebaseAuthError(googleError)));
    } finally {
      setGoogleBusy(false);
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!email || !password) {
      setError(t("Enter your email and password."));
      return;
    }
    try {
      setBusy(true);
      setError("");
      setMessage("");
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // No role yet -> finish registration. Backend unreachable -> stay and let them retry
      // rather than sending a possibly-registered user through onboarding again.
      await routeSignedInUser();
    } catch (loginError) {
      console.error("[KisanSetu] Login failed:", loginError?.code, loginError);
      setError(t(getFirebaseAuthError(loginError)));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError(t("Enter your email above first, then click \"Forgot password\"."));
      return;
    }
    try {
      setBusy(true);
      setError("");
      await sendPasswordResetEmail(auth, email.trim());
      setMessage(t("Password reset link sent to {email}.", { email }));
    } catch (resetError) {
      console.error("[KisanSetu] Password reset failed:", resetError?.code, resetError);
      setError(t(getFirebaseAuthError(resetError)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="login-page">
      <div className="login-wash" aria-hidden="true" />
      <section className="login-panel" aria-label={t("Login credentials")}>
        <div className="login-language-picker">
          <label htmlFor="login-language">{t("Language")}</label>
          <select id="login-language" value={lang} onChange={(event) => setLang(event.target.value)}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        {error && <p className="registration-message error" role="alert">{error}</p>}
        {message && <output className="registration-message success">{message}</output>}
        <GoogleSignInButton onClick={handleGoogle} busy={googleBusy} />
        <div className="auth-divider">{t("or")}</div>
        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="login-email">{t("Email")}</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
          <label htmlFor="login-password">{t("Password")}</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("Your password")}
            autoComplete="current-password"
            required
          />
          <button className="login-button" type="submit" disabled={busy}>
            {busy ? t("Signing in...") : t("Log in")} <span aria-hidden="true">→</span>
          </button>
          <button type="button" className="text-action" onClick={handleForgotPassword} disabled={busy}>
            {t("Forgot password?")}
          </button>
        </form>
        <p className="login-register-prompt">
          {t("Not registered yet?")} <Link to="/register">{t("Create an account")}</Link>
        </p>
      </section>
    </main>
  );
}
