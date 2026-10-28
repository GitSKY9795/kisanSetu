import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
  updatePassword,
  updateProfile,
} from "firebase/auth";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { auth, finishGoogleRedirect, getFirebaseAuthError, isGoogleUser, signInWithGoogle } from "../firebase.js";
import GoogleSignInButton from "../components/GoogleSignInButton.jsx";
import { T } from "../i18n/mark.js";
import { registerBuyer, registerFarmer, registerFpo, setUsername as apiSetUsername } from "../api/client.js";

const EMAIL_FOR_SIGNIN_KEY = "kisansetu_email_for_signin";

const ROLES = [
  { value: "FARMER", label: T("Farmer"), icon: "👨‍🌾", blurb: T("Sell your produce, track mandi prices, join FPO pools.") },
  { value: "BUYER", label: T("Buyer"), icon: "🏬", blurb: T("Post requirements, browse listings, negotiate direct deals.") },
  { value: "FPO", label: T("FPO"), icon: "🤝", blurb: T("Aggregate member produce into bulk lots for better rates.") },
];

const initialForm = {
  email: "",
  username: "",
  password: "",
  confirmPassword: "",
  role: "",
  name: "",
  phone: "",
  state: "",
  district: "",
  village: "",
  pin: "",
  farmerType: "",
  landArea: "",
  crops: "",
  organization: "",
  buyerCategory: "Wholesaler",
  registrationId: "",
};

function hasPasswordProvider(user) {
  return Boolean(user?.providerData?.some((p) => p.providerId === "password"));
}

export default function Register() {
  const navigate = useNavigate();
  const { lang, setLang, languages, t, tn } = useLanguage();
  const { firebaseUser, account, role: existingRole, loading: authLoading, refresh } = useAuth();
  const [step, setStep] = useState(1); // 1 verify email, 2 set username/password, 3 choose role, 4 role details
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [linkSent, setLinkSent] = useState(false);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);

  // Resume at the right step based on current auth state.
  useEffect(() => {
    if (authLoading) return;
    if (existingRole) {
      navigate(ROLE_HOME[existingRole] || "/home", { replace: true });
      return;
    }
    if (firebaseUser && account) {
      // Step 2 only exists to give an email-link account a way to log in again. Someone who
      // already has a password or signed in with Google goes straight to choosing a role —
      // previously a missing username sent password users back to step 2 on every visit.
      if (hasPasswordProvider(firebaseUser) || isGoogleUser(firebaseUser)) {
        setStep((current) => (current < 3 ? 3 : current));
      } else {
        setStep((current) => (current < 2 ? 2 : current));
      }
      setForm((current) => ({
        ...current,
        email: firebaseUser.email || current.email,
        username: account.username || current.username,
        name: current.name || firebaseUser.displayName || "",
      }));
    }
  }, [authLoading, firebaseUser, account, existingRole, navigate]);

  // Handle landing here from the emailed verification link. The email-link oobCode is
  // single-use, so this must run exactly once even under React 18 StrictMode's
  // deliberate double-invoke of effects in development.
  const emailLinkHandled = useRef(false);
  useEffect(() => {
    if (emailLinkHandled.current) return;
    if (!isSignInWithEmailLink(auth, window.location.href)) return;
    emailLinkHandled.current = true;
    const storedEmail = window.localStorage.getItem(EMAIL_FOR_SIGNIN_KEY);
    if (!storedEmail) {
      setNeedsEmailConfirm(true);
      return;
    }
    completeEmailLinkSignIn(storedEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completeEmailLinkSignIn = async (emailToConfirm) => {
    try {
      setSending(true);
      setErrors({});
      await signInWithEmailLink(auth, emailToConfirm, window.location.href);
      window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
      window.history.replaceState({}, document.title, "/register");
      setNeedsEmailConfirm(false);
      await refresh();
      setStep(2);
    } catch (error) {
      // If a concurrent call already completed the sign-in (e.g. StrictMode's double
      // effect invoke in dev), we're already in the target state — recover silently
      // instead of surfacing a spurious error.
      if (auth.currentUser?.email === emailToConfirm) {
        window.localStorage.removeItem(EMAIL_FOR_SIGNIN_KEY);
        window.history.replaceState({}, document.title, "/register");
        setNeedsEmailConfirm(false);
        await refresh();
        setStep(2);
        return;
      }
      console.error("[KisanSetu] Email link sign-in failed:", error?.code, error);
      setErrors({ form: t(getFirebaseAuthError(error)), formError: true });
    } finally {
      setSending(false);
    }
  };

  const [googleBusy, setGoogleBusy] = useState(false);

  const afterGoogleSignIn = async () => {
    const me = await refresh();
    if (me?.role) {
      navigate(ROLE_HOME[me.role] || "/home", { replace: true });
    } else if (me) {
      setStep(3);
    } else {
      setErrors({ form: t("Signed in, but couldn't reach the server to load your account. Please try again."), formError: true });
    }
  };

  // Finish a Google sign-in that fell back to a full-page redirect (popup was blocked).
  useEffect(() => {
    finishGoogleRedirect()
      .then((user) => user && afterGoogleSignIn())
      .catch((error) => setErrors({ form: t(getFirebaseAuthError(error)), formError: true }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoogle = async () => {
    try {
      setGoogleBusy(true);
      setErrors({});
      const user = await signInWithGoogle();
      if (user) await afterGoogleSignIn();
    } catch (error) {
      console.error("[KisanSetu] Google sign-in failed:", error?.code, error);
      setErrors({ form: t(getFirebaseAuthError(error)), formError: true });
    } finally {
      setGoogleBusy(false);
    }
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const sendVerificationLink = async () => {
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrors({ email: t("Enter a valid email address.") });
      return;
    }
    try {
      setSending(true);
      setErrors({});
      const actionCodeSettings = { url: `${window.location.origin}/register`, handleCodeInApp: true };
      await sendSignInLinkToEmail(auth, form.email.trim(), actionCodeSettings);
      window.localStorage.setItem(EMAIL_FOR_SIGNIN_KEY, form.email.trim());
      setLinkSent(true);
    } catch (error) {
      console.error("[KisanSetu] Sending verification link failed:", error?.code, error);
      setErrors({ form: t(getFirebaseAuthError(error)), formError: true });
    } finally {
      setSending(false);
    }
  };

  const validateUsernamePassword = () => {
    const nextErrors = {};
    if (!/^[a-zA-Z0-9_.]{3,24}$/.test(form.username)) {
      nextErrors.username = t("3-24 characters: letters, numbers, underscore or dot.");
    }
    if (form.password.length < 6) nextErrors.password = t("Use at least 6 characters.");
    if (form.password !== form.confirmPassword) nextErrors.confirmPassword = t("Passwords do not match.");
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeUsernameAndPassword = async (event) => {
    event.preventDefault();
    if (!validateUsernamePassword() || saving) return;
    try {
      setSaving(true);
      if (hasPasswordProvider(auth.currentUser)) {
        // A password is already linked (e.g. a retried/interrupted attempt) — make sure
        // the one just typed here is the one that actually takes effect, not silently
        // discarded in favor of whatever was linked before.
        await updatePassword(auth.currentUser, form.password);
      } else {
        const credential = EmailAuthProvider.credential(auth.currentUser.email, form.password);
        await linkWithCredential(auth.currentUser, credential);
      }
      await updateProfile(auth.currentUser, { displayName: form.username });
      await apiSetUsername(form.username);
      await refresh();
      setStep(3);
    } catch (error) {
      console.error("[KisanSetu] Setting username/password failed:", error?.code, error);
      setErrors({ form: t(getFirebaseAuthError(error)), formError: true });
    } finally {
      setSaving(false);
    }
  };

  const chooseRole = (roleValue) => {
    updateField("role", roleValue);
    setStep(4);
  };

  const validateRoleDetails = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t("Enter a name.");
    if (!/^[6-9]\d{9}$/.test(form.phone)) nextErrors.phone = t("Enter a valid 10-digit mobile number.");
    if (form.role === "FARMER") {
      ["state", "district", "village"].forEach((f) => { if (!form[f].trim()) nextErrors[f] = t("Required."); });
      if (!form.farmerType) nextErrors.farmerType = t("Choose one.");
      if (!form.landArea || Number(form.landArea) <= 0) nextErrors.landArea = t("Enter your land area.");
      if (!form.crops.trim()) nextErrors.crops = t("Enter at least one crop.");
    } else if (form.role === "BUYER" || form.role === "FPO") {
      ["state", "district"].forEach((f) => { if (!form[f].trim()) nextErrors[f] = t("Required."); });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeRegistration = async (event) => {
    event.preventDefault();
    if (!validateRoleDetails() || saving) return;
    try {
      setSaving(true);
      const phone = `+91${form.phone}`;
      if (form.role === "FARMER") {
        await registerFarmer({
          name: form.name.trim(),
          phone,
          state: form.state.trim(),
          district: form.district.trim(),
          village: form.village.trim(),
          pin_code: form.pin || null,
          farmer_type: form.farmerType,
          land_area: Number(form.landArea),
          main_crops: form.crops.trim(),
        });
      } else if (form.role === "BUYER") {
        await registerBuyer({
          name: form.name.trim(),
          phone,
          organization: form.organization.trim() || null,
          buyer_category: form.buyerCategory,
          district: form.district.trim(),
          state: form.state.trim(),
        });
      } else if (form.role === "FPO") {
        await registerFpo({
          name: form.name.trim(),
          phone,
          registration_id: form.registrationId.trim() || null,
          district: form.district.trim(),
          state: form.state.trim(),
        });
      }
      await refresh();
      setComplete(true);
    } catch (error) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      if (status === 400 && detail === "This account is already registered.") {
        // The backend's own registration record is the source of truth here: if it says
        // this account is already registered, the fix is to load that existing role and
        // continue, not to leave the person stuck re-filling a form that will only ever
        // be rejected the same way.
        const me = await refresh();
        if (me?.role) {
          navigate(ROLE_HOME[me.role] || "/home", { replace: true });
          return;
        }
      }
      const message = detail || t("Could not save your registration. Check that the backend is running and try again.");
      setErrors({ form: message, formError: true });
    } finally {
      setSaving(false);
    }
  };

  if (complete) {
    return (
      <main className="registration-page">
        <div className="login-wash" aria-hidden="true" />
        <section className="registration-panel registration-success" aria-live="polite">
          <div className="success-icon" aria-hidden="true">✓</div>
          <p className="registration-eyebrow">{t("Registration complete")}</p>
          <h1>{t("Welcome to Kisan Setu")}</h1>
          <p>{tn("Your {role} account is ready, {username}.", { role: <strong>{t(ROLES.find((r) => r.value === form.role)?.label || form.role)}</strong>, username: <strong>{form.username || form.name}</strong> })}</p>
          <button className="registration-primary" type="button" onClick={() => navigate(ROLE_HOME[form.role] || "/home")}>
            {t("Continue to Dashboard")} <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="registration-page">
      <div className="login-wash" aria-hidden="true" />
      <section className="registration-panel" aria-labelledby="registration-title">
        <div className="registration-topbar">
          <Link className="registration-back-login" to="/login">{t("← Back to login")}</Link>
          <select aria-label={t("Select language")} value={lang} onChange={(event) => setLang(event.target.value)}>
            {languages.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <div className="registration-heading">
          <p className="registration-eyebrow">{t("Kisan Setu onboarding")}</p>
          <h1 id="registration-title">{t("Create your account")}</h1>
          <p>{t("Verify your email, set a username + password, then tell us how you'll use Kisan Setu.")}</p>
        </div>
        <ol className="registration-progress" aria-label={t("Registration progress")}>
          {[t("Verify Email"), t("Username & Password"), t("Choose Role"), t("Your Details")].map((label, index) => (
            <li key={label} className={step >= index + 1 ? "active" : ""}>
              <span>{index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>

        {errors.form && <p className={`registration-message ${errors.formError ? "error" : "success"}`}>{errors.form}</p>}

        {step === 1 && (
          <div className="registration-step">
            <h2>{t("Verify Email")}</h2>
            {needsEmailConfirm ? (
              <>
                <p className="step-help">{t("Confirm the email you signed up with to finish verification.")}</p>
                <Field label={t("Email")} error={errors.email}>
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" />
                </Field>
                <button type="button" className="registration-primary" disabled={sending} onClick={() => completeEmailLinkSignIn(form.email.trim())}>
                  {sending ? t("Verifying...") : t("Confirm Email")}
                </button>
              </>
            ) : linkSent ? (
              <p className="registration-message success">
                {tn("We've sent a verification link to {email}. Open it on this device to continue.", { email: <strong>{form.email}</strong> })}
              </p>
            ) : (
              <>
                <GoogleSignInButton onClick={handleGoogle} busy={googleBusy} />
                <div className="auth-divider">{t("or")}</div>
                <p className="step-help">{t("We'll email you a link to confirm it's really you.")}</p>
                <Field label={t("Email Address")} error={errors.email}>
                  <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} placeholder="you@example.com" autoComplete="email" />
                </Field>
                <button type="button" className="registration-primary" disabled={sending} onClick={sendVerificationLink}>
                  {sending ? t("Sending...") : t("Send Verification Link")} <span aria-hidden="true">→</span>
                </button>
              </>
            )}
          </div>
        )}

        {step === 2 && (
          <form className="registration-step" onSubmit={completeUsernameAndPassword}>
            <h2>{t("Set Username & Password")}</h2>
            <p className="step-help">{t("Email verified. Choose how you'll log in from now on.")}</p>
            <Field label={t("Username")} error={errors.username}>
              <input value={form.username} onChange={(event) => updateField("username", event.target.value)} placeholder={t("e.g. ramesh_farms")} autoComplete="username" />
            </Field>
            <Field label={t("Password")} error={errors.password}>
              <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder={t("At least 6 characters")} autoComplete="new-password" />
            </Field>
            <Field label={t("Confirm Password")} error={errors.confirmPassword}>
              <input type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder={t("Re-enter your password")} autoComplete="new-password" />
            </Field>
            <button type="submit" className="registration-primary" disabled={saving}>
              {saving ? t("Saving...") : t("Continue")} <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {step === 3 && (
          <div className="registration-step">
            <h2>{t("Choose your role")}</h2>
            <p className="step-help">{t("This decides which dashboard and features you'll see.")}</p>
            <div className="choice-row" style={{ flexDirection: "column", gap: "0.75rem" }}>
              {ROLES.map((r) => (
                <button key={r.value} type="button" className="choice" style={{ textAlign: "left", display: "flex", gap: "0.75rem", alignItems: "center" }} onClick={() => chooseRole(r.value)}>
                  <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>{r.icon}</span>
                  <span>
                    <strong style={{ display: "block" }}>{t(r.label)}</strong>
                    <small>{t(r.blurb)}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <form className="registration-form" onSubmit={completeRegistration}>
            <div className="registration-step">
              <h2>{t("{role} details", { role: t(ROLES.find((r) => r.value === form.role)?.label || "") })}</h2>
              <Field label={t("Full Name / Organization Name")} error={errors.name}>
                <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder={t("Enter your name")} autoComplete="name" />
              </Field>
              <Field label={t("Mobile Number")} error={errors.phone}>
                <div className="phone-input-wrap">
                  <span className="phone-country-code">+91</span>
                  <input value={form.phone} onChange={(event) => updateField("phone", event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder={t("10-digit mobile number")} inputMode="numeric" autoComplete="tel" />
                </div>
              </Field>

              {form.role === "FARMER" && (
                <>
                  <Field label={t("State")} error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label={t("District")} error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                  <div className="registration-grid">
                    <Field label={t("Village")} error={errors.village}><input value={form.village} onChange={(event) => updateField("village", event.target.value)} /></Field>
                    <Field label={t("PIN Code")} error={errors.pin}><input value={form.pin} onChange={(event) => updateField("pin", event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" /></Field>
                  </div>
                  <Field label={t("Farmer Type")} error={errors.farmerType}>
                    <div className="choice-row">
                      {[T("Land Owner"), T("Tenant")].map((type) => <button key={type} type="button" className={form.farmerType === type ? "choice selected" : "choice"} onClick={() => updateField("farmerType", type)}>{t(type)}</button>)}
                    </div>
                  </Field>
                  <Field label={t("Land Area (acres)")} error={errors.landArea}><input type="number" min="0" step="0.1" value={form.landArea} onChange={(event) => updateField("landArea", event.target.value)} placeholder={t("Example: 2.5")} /></Field>
                  <Field label={t("Main Crop(s) Grown")} error={errors.crops}><input value={form.crops} onChange={(event) => updateField("crops", event.target.value)} placeholder={t("Example: Wheat, soybean")} /></Field>
                </>
              )}

              {form.role === "BUYER" && (
                <>
                  <Field label={t("Organization")}><input value={form.organization} onChange={(event) => updateField("organization", event.target.value)} placeholder={t("Company / firm name")} /></Field>
                  <Field label={t("Buyer Category")}>
                    <select value={form.buyerCategory} onChange={(event) => updateField("buyerCategory", event.target.value)}>
                      <option value="Wholesaler">{t("Wholesaler")}</option>
                      <option value="Processor">{t("Food Processor")}</option>
                      <option value="Retailer">{t("Retail Chain")}</option>
                      <option value="Institutional">{t("Institutional Buyer")}</option>
                      <option value="Bulk">{t("Bulk Exporter")}</option>
                    </select>
                  </Field>
                  <Field label={t("State")} error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label={t("District")} error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                </>
              )}

              {form.role === "FPO" && (
                <>
                  <Field label={t("Registration ID (optional)")}><input value={form.registrationId} onChange={(event) => updateField("registrationId", event.target.value)} /></Field>
                  <Field label={t("State")} error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label={t("District")} error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                </>
              )}
            </div>
            <div className="registration-actions">
              <button type="button" className="registration-secondary" onClick={() => setStep(3)}>{t("Back")}</button>
              <button type="submit" className="registration-primary" disabled={saving}>{saving ? t("Saving...") : t("Create Account")} <span aria-hidden="true">→</span></button>
            </div>
          </form>
        )}
      </section>
    </main>
  );
}

function Field({ label, error, children }) {
  return <label className="registration-field"><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
