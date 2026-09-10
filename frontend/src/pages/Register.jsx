import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { useLanguage } from "../context/LanguageContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { auth, getFirebaseOtpError } from "../firebase.js";
import { registerBuyer, registerFarmer, registerFpo } from "../api/client.js";

const ROLES = [
  { value: "FARMER", label: "Farmer", icon: "👨‍🌾", blurb: "Sell your produce, track mandi prices, join FPO pools." },
  { value: "BUYER", label: "Buyer", icon: "🏬", blurb: "Post requirements, browse listings, negotiate direct deals." },
  { value: "FPO", label: "FPO", icon: "🤝", blurb: "Aggregate member produce into bulk lots for better rates." },
];

const initialForm = {
  name: "",
  mobile: "",
  otp: "",
  role: "",
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

export default function Register() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const { firebaseUser, role: existingRole, loading: authLoading, refresh } = useAuth();
  const [step, setStep] = useState(1); // 1 = verify mobile, 2 = choose role, 3 = role details
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(Boolean(firebaseUser));
  const [resendIn, setResendIn] = useState(0);
  const [complete, setComplete] = useState(false);
  const [otpConfirmation, setOtpConfirmation] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && existingRole) navigate(ROLE_HOME[existingRole] || "/home", { replace: true });
  }, [authLoading, existingRole, navigate]);

  useEffect(() => {
    if (firebaseUser && step === 1) {
      setOtpVerified(true);
      setStep(2);
    }
  }, [firebaseUser, step]);

  useEffect(() => {
    if (resendIn <= 0) return undefined;
    const timer = window.setInterval(() => setResendIn((current) => Math.max(current - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "", form: "" }));
  };

  const getIndianPhoneNumber = () => `+91${form.mobile}`;

  const sendOtp = async () => {
    if (!/^[6-9]\d{9}$/.test(form.mobile)) {
      setErrors({ mobile: "Enter a valid 10-digit mobile number." });
      return;
    }
    try {
      setOtpSending(true);
      setErrors({});
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", { size: "invisible" });
      }
      const confirmation = await signInWithPhoneNumber(auth, getIndianPhoneNumber(), window.recaptchaVerifier);
      setOtpConfirmation(confirmation);
      setOtpSent(true);
      setResendIn(30);
      setErrors({ form: `OTP sent to ${getIndianPhoneNumber()}.` });
    } catch (error) {
      setErrors({ form: getFirebaseOtpError(error), formError: true });
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        delete window.recaptchaVerifier;
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!otpConfirmation || !/^\d{6}$/.test(form.otp)) {
      setErrors({ otp: "Enter the 6-digit OTP sent to your mobile." });
      return;
    }
    try {
      await otpConfirmation.confirm(form.otp);
      setOtpVerified(true);
      setStep(2);
    } catch (error) {
      setErrors({ otp: error?.code === "auth/invalid-verification-code" ? "Incorrect OTP. Please try again." : getFirebaseOtpError(error) });
    }
  };

  const chooseRole = (roleValue) => {
    updateField("role", roleValue);
    setStep(3);
  };

  const validateRoleDetails = () => {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = "Enter a name.";
    if (form.role === "FARMER") {
      ["state", "district", "village"].forEach((f) => { if (!form[f].trim()) nextErrors[f] = "Required."; });
      if (!form.farmerType) nextErrors.farmerType = "Choose one.";
      if (!form.landArea || Number(form.landArea) <= 0) nextErrors.landArea = "Enter your land area.";
      if (!form.crops.trim()) nextErrors.crops = "Enter at least one crop.";
    } else if (form.role === "BUYER" || form.role === "FPO") {
      ["state", "district"].forEach((f) => { if (!form[f].trim()) nextErrors[f] = "Required."; });
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const completeRegistration = async (event) => {
    event.preventDefault();
    if (!validateRoleDetails() || saving) return;
    try {
      setSaving(true);
      const phone = getIndianPhoneNumber();
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
      const message = error?.response?.data?.detail || "Could not save your registration. Check that the backend is running and try again.";
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
          <p className="registration-eyebrow">Registration complete</p>
          <h1>Welcome to Kisan Setu</h1>
          <p>Your <strong>{form.role}</strong> account is ready, <strong>{form.name}</strong>.</p>
          <button className="registration-primary" type="button" onClick={() => navigate(ROLE_HOME[form.role] || "/home")}>
            Continue to Dashboard <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  let otpButtonLabel = "Send OTP";
  if (otpSent) otpButtonLabel = resendIn > 0 ? `Resend ${resendIn}s` : "Resend OTP";

  return (
    <main className="registration-page">
      <div className="login-wash" aria-hidden="true" />
      <section className="registration-panel" aria-labelledby="registration-title">
        <div className="registration-topbar">
          <Link className="registration-back-login" to="/login">← Back to login</Link>
          <select aria-label="Select language" value={lang} onChange={(event) => setLang(event.target.value)}>
            <option value="en">English</option>
            <option value="hi">हिन्दी</option>
            <option value="mr">मराठी</option>
          </select>
        </div>
        <div id="recaptcha-container" aria-hidden="true" />
        <div className="registration-heading">
          <p className="registration-eyebrow">Kisan Setu onboarding</p>
          <h1 id="registration-title">Create your account</h1>
          <p>Verify your mobile number, then tell us how you'll use Kisan Setu.</p>
        </div>
        <ol className="registration-progress" aria-label="Registration progress">
          {["Verify Mobile", "Choose Role", "Your Details"].map((label, index) => (
            <li key={label} className={step >= index + 1 ? "active" : ""}>
              <span>{index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>

        {errors.form && <p className={`registration-message ${errors.formError ? "error" : "success"}`}>{errors.form}</p>}
        {errors.otp && <p className="registration-message error">{errors.otp}</p>}

        {step === 1 && (
          <div className="registration-step">
            <h2>Verify Mobile</h2>
            <p className="step-help">We'll send a one-time code to confirm it's you.</p>
            <Field label="Mobile Number" error={errors.mobile}>
              <div className="registration-input-action">
                <div className="phone-input-wrap">
                  <span className="phone-country-code">+91</span>
                  <input value={form.mobile} onChange={(event) => updateField("mobile", event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel" />
                </div>
                <button type="button" className="inline-action" onClick={sendOtp} disabled={resendIn > 0 || otpSending}>{otpSending ? "Sending..." : otpButtonLabel}</button>
              </div>
            </Field>
            {otpSent && (
              <Field label="Enter OTP" error={errors.otp}>
                <div className="registration-input-action">
                  <input value={form.otp} onChange={(event) => updateField("otp", event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" inputMode="numeric" autoComplete="one-time-code" />
                  <button type="button" className="inline-action" onClick={verifyOtp}>Verify OTP</button>
                </div>
              </Field>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="registration-step">
            <h2>Choose your role</h2>
            <p className="step-help">This decides which dashboard and features you'll see.</p>
            <div className="choice-row" style={{ flexDirection: "column", gap: "0.75rem" }}>
              {ROLES.map((r) => (
                <button key={r.value} type="button" className="choice" style={{ textAlign: "left", display: "flex", gap: "0.75rem", alignItems: "center" }} onClick={() => chooseRole(r.value)}>
                  <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>{r.icon}</span>
                  <span>
                    <strong style={{ display: "block" }}>{r.label}</strong>
                    <small>{r.blurb}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <form className="registration-form" onSubmit={completeRegistration}>
            <div className="registration-step">
              <h2>{ROLES.find((r) => r.value === form.role)?.label} Details</h2>
              <Field label="Full Name / Organization Name" error={errors.name}>
                <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter your name" autoComplete="name" />
              </Field>

              {form.role === "FARMER" && (
                <>
                  <Field label="State" error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label="District" error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                  <div className="registration-grid">
                    <Field label="Village" error={errors.village}><input value={form.village} onChange={(event) => updateField("village", event.target.value)} /></Field>
                    <Field label="PIN Code" error={errors.pin}><input value={form.pin} onChange={(event) => updateField("pin", event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" /></Field>
                  </div>
                  <Field label="Farmer Type" error={errors.farmerType}>
                    <div className="choice-row">
                      {["Land Owner", "Tenant"].map((type) => <button key={type} type="button" className={form.farmerType === type ? "choice selected" : "choice"} onClick={() => updateField("farmerType", type)}>{type}</button>)}
                    </div>
                  </Field>
                  <Field label="Land Area (acres)" error={errors.landArea}><input type="number" min="0" step="0.1" value={form.landArea} onChange={(event) => updateField("landArea", event.target.value)} placeholder="Example: 2.5" /></Field>
                  <Field label="Main Crop(s) Grown" error={errors.crops}><input value={form.crops} onChange={(event) => updateField("crops", event.target.value)} placeholder="Example: Wheat, soybean" /></Field>
                </>
              )}

              {form.role === "BUYER" && (
                <>
                  <Field label="Organization"><input value={form.organization} onChange={(event) => updateField("organization", event.target.value)} placeholder="Company / firm name" /></Field>
                  <Field label="Buyer Category">
                    <select value={form.buyerCategory} onChange={(event) => updateField("buyerCategory", event.target.value)}>
                      <option value="Wholesaler">Wholesaler</option>
                      <option value="Processor">Food Processor</option>
                      <option value="Retailer">Retail Chain</option>
                      <option value="Institutional">Institutional Buyer</option>
                      <option value="Bulk">Bulk Exporter</option>
                    </select>
                  </Field>
                  <Field label="State" error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label="District" error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                </>
              )}

              {form.role === "FPO" && (
                <>
                  <Field label="Registration ID (optional)"><input value={form.registrationId} onChange={(event) => updateField("registrationId", event.target.value)} /></Field>
                  <Field label="State" error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} /></Field>
                  <Field label="District" error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} /></Field>
                </>
              )}
            </div>
            <div className="registration-actions">
              <button type="button" className="registration-secondary" onClick={() => setStep(2)}>Back</button>
              <button type="submit" className="registration-primary" disabled={saving}>{saving ? "Saving..." : "Create Account"} <span aria-hidden="true">→</span></button>
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
