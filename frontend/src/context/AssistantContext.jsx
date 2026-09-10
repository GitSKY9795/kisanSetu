import React, { createContext, useContext, useState } from "react";

const AssistantContext = createContext(null);

export function AssistantProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialMode, setInitialMode] = useState("text"); // "text" | "voice"
  const [seedContext, setSeedContext] = useState(null); // e.g. { crop_name, quantity_kg, district }

  const openAssistant = (options = {}) => {
    setInitialMode(options.mode || "text");
    setSeedContext(options.context || null);
    setIsOpen(true);
  };
  const closeAssistant = () => setIsOpen(false);

  return (
    <AssistantContext.Provider value={{ isOpen, openAssistant, closeAssistant, initialMode, seedContext }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) throw new Error("useAssistant must be used within an AssistantProvider");
  return ctx;
}
