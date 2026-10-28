import "../styles/dashboard.css";
import { useState } from "react";
import { Link } from "react-router-dom";
import { updateProfile } from "../api/client.js";
import { ArrowRightIcon } from "../components/icons.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";
import { T } from "../i18n/mark.js";

const maskPhone = (phone) => (phone ? `${phone.slice(0, 3)}••••••${phone.slice(-2)}` : null);
const titleCase = (s) => s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());
const localPhone = (phone) => (phone || "").replace(/^\+91/, "");

const FARMER_TYPES = [T("Land Owner"), T("Tenant")];
const BUYER_CATEGORIES = [
  { value: "Wholesaler", label: T("Wholesaler") },
  { value: "Processor", label: T("Food Processor") },
  { value: "Retailer", label: T("Retail Chain") },
  { value: "Institutional", label: T("Institutional Buyer") },
  { value: "Bulk", label: T("Bulk Exporter") },
];

// What each role can edit: [field, label, kind]. The backend accepts exactly these fields.
const EDITABLE = {
  FARMER: [
    ["name", T("Full Name / Organization Name"), "text"],
    ["phone", T("Mobile number"), "phone"],
    ["village", T("Village"), "text"],
    ["district", T("District"), "text"],
    ["state", T("State"), "text"],
    ["pin_code", T("PIN code"), "pin"],
    ["farmer_type", T("Farmer type"), "farmerType"],
    ["land_area", T("Land Area (acres)"), "number"],
    ["main_crops", T("Main crops"), "text"],
  ],
  BUYER: [
    ["name", T("Full Name / Organization Name"), "text"],
    ["phone", T("Mobile number"), "phone"],
    ["organization", T("Organization"), "optional"],
    ["buyer_category", T("Buyer Category"), "buyerCategory"],
    ["district", T("District"), "text"],
    ["state", T("State"), "text"],
  ],
  FPO: [
    ["name", T("Full Name / Organization Name"), "text"],
    ["phone", T("Mobile number"), "phone"],
    ["registration_id", T("Registration ID (optional)"), "optional"],
    ["district", T("District"), "text"],
    ["state", T("State"), "text"],
  ],
};

const KICKER = { FARMER: T("Farmer profile"), BUYER: T("Buyer profile"), FPO: T("FPO profile") };

/** The profile as the form edits it (phone without +91, numbers as text). */
function toForm(role, profile) {
  const phone = role === "FPO" ? profile?.contact_phone : profile?.phone;
  const form = {};
  for (const [field] of EDITABLE[role] || []) {
    form[field] = field === "phone" ? localPhone(phone) : profile?.[field] == null ? "" : String(profile[field]);
  }
  return form;
}

export default function Profile() {
  const { t } = useLanguage();
  const { profile, account, role, refresh } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "success" | "error", text }

  const fields = EDITABLE[role] || [];
  const phone = role === "FPO" ? profile?.contact_phone : profile?.phone;
  const name = profile?.name || account?.full_name || account?.username || t("Account");

  const display = (field) => {
    const value = profile?.[field];
    if (value == null || value === "") return null;
    if (field === "main_crops") return value.split(",").map((c) => t(titleCase(c.trim()))).join(", ");
    if (field === "farmer_type") return t(value);
    if (field === "buyer_category") return t(BUYER_CATEGORIES.find((c) => c.value === value)?.label || value);
    if (field === "land_area") return t("{area} acres", { area: value });
    return value;
  };

  const viewRows = [
    [t("Mobile number"), maskPhone(phone)],
    [t("Email"), account?.email],
    [t("Username"), account?.username ? `@${account.username}` : null],
    ...fields.filter(([field]) => field !== "name" && field !== "phone").map(([field, label]) => [t(label), display(field)]),
  ];
  const filled = viewRows.filter(([, value]) => value).length;
  const completion = Math.round((filled / viewRows.length) * 100);

  const startEditing = () => {
    setForm(toForm(role, profile));
    setErrors({});
    setNotice(null);
    setEditing(true);
  };

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const next = {};
    for (const [field, , kind] of fields) {
      const value = (form[field] || "").trim();
      if (kind === "phone" && !/^[6-9]\d{9}$/.test(value)) next[field] = t("Enter a valid 10-digit mobile number.");
      else if (kind === "pin" && value && !/^\d{6}$/.test(value)) next[field] = t("PIN code must be 6 digits.");
      else if (kind === "number" && !(Number(value) > 0)) next[field] = t("Enter your land area.");
      else if (["text", "farmerType", "buyerCategory"].includes(kind) && !value) next[field] = t("Required.");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (event) => {
    event.preventDefault();
    if (!validate() || saving) return;
    const original = toForm(role, profile);
    const changes = {};
    for (const [field, , kind] of fields) {
      const value = (form[field] || "").trim();
      if (value === (original[field] || "").trim()) continue;
      if (kind === "phone") changes.phone = `+91${value}`;
      else if (kind === "number") changes[field] = Number(value);
      else changes[field] = value;
    }
    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }
    try {
      setSaving(true);
      await updateProfile(changes);
      await refresh();
      setEditing(false);
      setNotice({ kind: "success", text: t("Profile updated.") });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      setNotice({ kind: "error", text: typeof detail === "string" ? t(detail) : t("Could not update your profile. Please try again.") });
    } finally {
      setSaving(false);
    }
  };

  const input = (field, kind) => {
    const common = { id: `profile-${field}`, value: form[field] ?? "", onChange: (e) => update(field, e.target.value) };
    if (kind === "phone") {
      return (
        <div className="db-phone">
          <span>+91</span>
          <input {...common} inputMode="numeric" autoComplete="tel" onChange={(e) => update(field, e.target.value.replace(/\D/g, "").slice(0, 10))} />
        </div>
      );
    }
    if (kind === "pin") return <input {...common} inputMode="numeric" onChange={(e) => update(field, e.target.value.replace(/\D/g, "").slice(0, 6))} />;
    if (kind === "number") return <input {...common} type="number" min="0" step="0.1" />;
    if (kind === "farmerType") {
      return (
        <select {...common}>
          <option value="">—</option>
          {FARMER_TYPES.map((type) => <option key={type} value={type}>{t(type)}</option>)}
        </select>
      );
    }
    if (kind === "buyerCategory") {
      return <select {...common}>{BUYER_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{t(c.label)}</option>)}</select>;
    }
    return <input {...common} />;
  };

  return (
    <div className="db db-profile">
      <section className="db-card db-profile-card">
        <header className="db-profile-head">
          <span className="db-profile-avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
          <div>
            <span className="db-kicker">{t(KICKER[role] || "My Profile")}</span>
            <h1>{name}</h1>
            <p>{[profile?.village, profile?.district, profile?.state].filter(Boolean).join(", ") || t("Location not set")}</p>
          </div>
          {!editing && fields.length > 0 && (
            <button type="button" className="db-btn db-btn-light small" onClick={startEditing}>{t("Edit Profile")}</button>
          )}
          <Link to={ROLE_HOME[role] || "/home"} className="db-btn db-btn-dark small">{t("Back to Dashboard")} <ArrowRightIcon size={14} /></Link>
        </header>

        {notice && <p className={`db-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>{notice.text}</p>}

        {editing ? (
          <form className="db-profile-form" onSubmit={save} noValidate>
            <div className="db-profile-grid">
              {fields.map(([field, label, kind]) => (
                <label key={field} htmlFor={`profile-${field}`} className={errors[field] ? "has-error" : ""}>
                  <span>{t(label)}</span>
                  {input(field, kind)}
                  {errors[field] && <small>{errors[field]}</small>}
                </label>
              ))}
            </div>
            <div className="db-profile-actions">
              <button type="button" className="db-btn db-btn-light small" onClick={() => setEditing(false)} disabled={saving}>{t("Cancel")}</button>
              <button type="submit" className="db-btn db-btn-dark small" disabled={saving}>{saving ? t("Saving...") : t("Save Changes")}</button>
            </div>
          </form>
        ) : (
          <>
            <dl className="db-profile-grid">
              {viewRows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value || t("Not added")}</dd>
                </div>
              ))}
            </dl>

            <div className="db-completion">
              <div><span>{t("Profile completion")}</span><strong>{completion}%</strong></div>
              <div className="db-completion-track"><span style={{ width: `${completion}%` }} /></div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
