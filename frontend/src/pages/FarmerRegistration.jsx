import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext.jsx";
import { auth, getFirebaseOtpError } from "../firebase.js";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { createApplicationSession, createFarmer } from "../api/client.js";

const initialForm = {
  name: "",
  mobile: "",
  otp: "",
  state: "",
  district: "",
  village: "",
  pin: "",
  farmerType: "",
  landArea: "",
  crops: "",
  password: "",
  confirmPassword: "",
};

const steps = ["Basic Details", "Location", "Farming", "Account"];

export default function FarmerRegistration() {
  const navigate = useNavigate();
  const { lang, setLang } = useLanguage();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [complete, setComplete] = useState(false);
  const [otpConfirmation, setOtpConfirmation] = useState(null);
  const [otpSending, setOtpSending] = useState(false);
  const [saving, setSaving] = useState(false);

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
      setOtpVerified(false);
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
      setErrors({ form: "Mobile number verified successfully." });
    } catch (error) {
      setErrors({ otp: error?.code === "auth/invalid-verification-code" ? "Incorrect OTP. Please try again." : getFirebaseOtpError(error) });
    }
  };

  const validateStep = () => {
    const validators = [validateBasic, validateLocation, validateFarming, validateAccount];
    const nextErrors = validators[step - 1](form, otpVerified);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, 4));
  };

  const previousStep = () => {
    setErrors({});
    setStep((current) => Math.max(current - 1, 1));
  };

  const completeRegistration = async (event) => {
    event.preventDefault();
    if (!validateStep() || saving) return;
    try {
      setSaving(true);
      const firebaseToken = await auth.currentUser.getIdToken();
      await createFarmer({
        full_name: form.name.trim(),
        mobile_number: getIndianPhoneNumber(),
        state: form.state.trim(),
        district: form.district.trim(),
        village: form.village.trim(),
        pin_code: form.pin,
        farmer_type: form.farmerType,
        land_area: Number(form.landArea),
        main_crops: form.crops.trim(),
      }, firebaseToken);
      await createApplicationSession(firebaseToken);
      setComplete(true);
    } catch (error) {
      const message = error?.response?.data?.error || "Could not save your registration. Check that the backend is running and try again.";
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
          <h1>Registration Successful</h1>
          <p>Welcome to Kisan Setu, <strong>{form.name}</strong>!</p>
          <button className="registration-primary" type="button" onClick={() => navigate("/home")}>
            Continue to Dashboard <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  }

  let otpButtonLabel = "Send OTP";
  if (otpSent) otpButtonLabel = resendIn > 0 ? `Resend ${resendIn}s` : "Resend OTP";
  let registrationActionLabel = "Next";
  if (step === 4) registrationActionLabel = "Create Account";
  if (saving) registrationActionLabel = "Saving...";

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
          <p className="registration-eyebrow">Kisan Setu farmer onboarding</p>
          <h1 id="registration-title">Create your farmer account</h1>
          <p>Complete these simple steps to join the Kisan Setu community.</p>
        </div>
        <ol className="registration-progress" aria-label="Registration progress">
          {steps.map((label, index) => (
            <li key={label} className={step >= index + 1 ? "active" : ""}>
              <span>{index + 1}</span>
              <b>{label}</b>
            </li>
          ))}
        </ol>

        {errors.form && <p className={`registration-message ${errors.formError ? "error" : "success"}`}>{errors.form}</p>}
        {errors.otp && <p className="registration-message error">{errors.otp}</p>}

        <form className="registration-form" onSubmit={step === 4 ? completeRegistration : (event) => { event.preventDefault(); nextStep(); }}>
          <div key={step} className="registration-step">
            {step === 1 && (
              <>
                <h2>Basic Details</h2>
                <p className="step-help">Tell us who you are and verify your mobile number.</p>
                <Field label="Full Name" error={errors.name}>
                  <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="Enter your full name" autoComplete="name" />
                </Field>
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
                      <button type="button" className="inline-action" onClick={verifyOtp}>{otpVerified ? "Verified ✓" : "Verify OTP"}</button>
                    </div>
                  </Field>
                )}
              </>
            )}
            {step === 2 && (
              <>
                <h2>Location</h2>
                <p className="step-help">Where is your farm located?</p>
                <Field label="State" error={errors.state}><input value={form.state} onChange={(event) => updateField("state", event.target.value)} placeholder="Enter your state" /></Field>
                <Field label="District" error={errors.district}><input value={form.district} onChange={(event) => updateField("district", event.target.value)} placeholder="Enter your district" /></Field>
                <div className="registration-grid">
                  <Field label="Village" error={errors.village}><input value={form.village} onChange={(event) => updateField("village", event.target.value)} placeholder="Village" /></Field>
                  <Field label="PIN Code" error={errors.pin}><input value={form.pin} onChange={(event) => updateField("pin", event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6 digits" inputMode="numeric" /></Field>
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <h2>Farming Details</h2>
                <p className="step-help">Help us understand your farming journey.</p>
                <Field label="Farmer Type" error={errors.farmerType}>
                  <div className="choice-row">
                    {["Land Owner", "Tenant"].map((type) => <button key={type} type="button" className={form.farmerType === type ? "choice selected" : "choice"} onClick={() => updateField("farmerType", type)}>{type}</button>)}
                  </div>
                </Field>
                <Field label="Land Area (acres)" error={errors.landArea}><input type="number" min="0" step="0.1" value={form.landArea} onChange={(event) => updateField("landArea", event.target.value)} placeholder="Example: 2.5" /></Field>
                <Field label="Main Crop(s) Grown" error={errors.crops}><input value={form.crops} onChange={(event) => updateField("crops", event.target.value)} placeholder="Example: Wheat, soybean" /></Field>
              </>
            )}
            {step === 4 && (
              <>
                <h2>Account Setup</h2>
                <p className="step-help">Set a password to keep your account secure.</p>
                <Field label="Password" error={errors.password}><input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="At least 6 characters" autoComplete="new-password" /></Field>
                <Field label="Confirm Password" error={errors.confirmPassword}><input type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="Re-enter your password" autoComplete="new-password" /></Field>
              </>
            )}
          </div>
          <div className="registration-actions">
            {step > 1 && <button type="button" className="registration-secondary" onClick={previousStep}>Back</button>}
            <button type="submit" className="registration-primary" disabled={saving}>{registrationActionLabel} <span aria-hidden="true">→</span></button>
          </div>
        </form>
      </section>
    </main>
  );
}

function validateBasic(form, otpVerified) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(form.mobile)) errors.mobile = "Enter a valid 10-digit mobile number.";
  if (!otpVerified) errors.otp = "Verify your mobile number to continue.";
  return errors;
}

function validateLocation(form) {
  const errors = {};
  ["state", "district", "village"].forEach((field) => {
    if (!form[field].trim()) errors[field] = "This field is required.";
  });
  if (!/^\d{6}$/.test(form.pin)) errors.pin = "Enter a valid 6-digit PIN code.";
  return errors;
}

function validateFarming(form) {
  const errors = {};
  if (!form.farmerType) errors.farmerType = "Choose your farmer type.";
  if (!form.landArea || Number(form.landArea) <= 0) errors.landArea = "Enter your land area.";
  if (!form.crops.trim()) errors.crops = "Enter at least one main crop.";
  return errors;
}

function validateAccount(form) {
  const errors = {};
  if (form.password.length < 6) errors.password = "Use at least 6 characters.";
  if (form.password !== form.confirmPassword) errors.confirmPassword = "Passwords do not match.";
  return errors;
}

function Field({ label, error, children }) {
  return <label className="registration-field"><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}
