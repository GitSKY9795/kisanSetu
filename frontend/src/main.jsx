import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import { AssistantProvider } from "./context/AssistantContext.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <AssistantProvider>
          <App />
        </AssistantProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
