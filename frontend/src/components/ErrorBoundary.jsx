import { Component } from "react";
import { useLanguage } from "../context/LanguageContext.jsx";

/** The fallback screen. A function component so it can read the chosen language. */
function FailedScreen() {
  const { t } = useLanguage();
  return (
    <div style={{ maxWidth: 440, margin: "72px auto", padding: 28, textAlign: "center", background: "#fff", border: "1px solid #e2ece4", borderRadius: 20, boxShadow: "0 6px 20px rgba(20,70,45,.06)" }}>
      <h2 style={{ margin: 0, fontSize: 18, color: "#123b2d" }}>{t("Something went wrong on this page")}</h2>
      <p style={{ margin: "8px 0 18px", fontSize: 13, color: "#62786f" }}>{t("Your data is safe. Reload the page to try again.")}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{ padding: "10px 20px", color: "#fff", background: "#0f4d38", border: 0, borderRadius: 12, font: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
      >
        {t("Reload page")}
      </button>
    </div>
  );
}

/** Keeps one broken screen from blanking the whole app: shows a short message with a
 * way back instead. Resets itself when `resetKey` (the current route) changes. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[KisanSetu] A screen failed to render:", error);
  }

  componentDidUpdate(prevProps) {
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <FailedScreen />;
  }
}
