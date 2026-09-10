import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { auth, getFirebaseOtpError } from "../firebase.js";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang, setLang, t } = useLanguage();
  const { firebaseUser, role, loading, refresh } = useAuth();
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.sessionExpired || "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (loading || !firebaseUser) return;
    navigate(role ? ROLE_HOME[role] || "/home" : "/register", { replace: true });
  }, [loading, firebaseUser, role, navigate]);

  const resetRecaptcha = () => {
    if (window.loginRecaptchaVerifier) {
      window.loginRecaptchaVerifier.clear();
      delete window.loginRecaptchaVerifier;
    }
  };

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      if (!window.loginRecaptchaVerifier) {
        window.loginRecaptchaVerifier = new RecaptchaVerifier(auth, "login-recaptcha-container", { size: "invisible" });
      }
      const result = await signInWithPhoneNumber(auth, `+91${mobile}`, window.loginRecaptchaVerifier);
      setConfirmation(result);
      setOtpSent(true);
      setMessage(`${t("login.otpSent")} +91${mobile}`);
    } catch (requestError) {
      setError(getFirebaseOtpError(requestError));
      resetRecaptcha();
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (!confirmation || !/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your mobile.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      await confirmation.confirm(otp);
    } catch (verificationError) {
      setError(getFirebaseOtpError(verificationError));
      setBusy(false);
      return;
    }
    try {
      const me = await refresh();
      navigate(me?.role ? ROLE_HOME[me.role] || "/home" : "/register", { replace: true });
    } catch (sessionError) {
      setError(sessionError?.response?.data?.detail || "OTP verified, but we couldn't reach the KisanSetu backend. Check that it's running.");
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
        <div id="login-recaptcha-container" aria-hidden="true" />
        {error && <p className="registration-message error" role="alert">{error}</p>}
        {message && <output className="registration-message success">{message}</output>}
        <form className="login-form" onSubmit={verifyOtp}>
          <label htmlFor="login-mobile">{t("login.mobileLabel")}</label>
          <div className="phone-input-wrap">
            <span className="phone-country-code">+91</span>
            <input id="login-mobile" value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder={t("login.mobilePlaceholder")} inputMode="numeric" autoComplete="tel" required />
          </div>
          <button className="login-button" type="button" onClick={sendOtp} disabled={busy}>
            {busy && !otpSent ? t("login.sendingOtp") : t("login.sendOtp")} <span aria-hidden="true">→</span>
          </button>
          {otpSent && (
            <>
              <label htmlFor="login-otp">{t("login.otpLabel")}</label>
              <input id="login-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder={t("login.otpPlaceholder")} inputMode="numeric" autoComplete="one-time-code" required />
              <button className="login-button" type="submit" disabled={busy}>
                {busy ? t("login.verifyingOtp") : t("login.verifyOtp")} <span aria-hidden="true">→</span>
              </button>
            </>
          )}
        </form>
        <p className="login-register-prompt">
          {t("login.newUser")} <Link to="/register">{t("login.createAccount")}</Link>
        </p>
      </section>
    </main>
  );
}
