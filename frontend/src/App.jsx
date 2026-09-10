import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import FarmerDashboard from "./pages/FarmerOverview.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import FPODashboard from "./pages/FPODashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import PriceTrends from "./pages/PriceTrends.jsx";
import LogisticsStorage from "./pages/LogisticsStorage.jsx";
import GrievancePortal from "./pages/GrievancePortal.jsx";
import Login from "./pages/Login.jsx";
import FarmerRegistration from "./pages/FarmerRegistration.jsx";
import AgentAssistantModal from "./components/AgentAssistantModal.jsx";
import FloatingAssistantButton from "./components/FloatingAssistantButton.jsx";
import { useAssistant } from "./context/AssistantContext.jsx";
import { getApplicationSession } from "./api/client.js";

export default function App() {
  const { isOpen, closeAssistant } = useAssistant();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (isPublicRoute) return undefined;
    const checkSession = () => {
      getApplicationSession().catch((error) => {
        if (error?.response?.status === 401) {
          navigate("/login", { replace: true, state: { sessionExpired: "Your session has expired. Please login again." } });
        }
      });
    };
    checkSession();
    const timer = window.setInterval(checkSession, 60000);
    return () => window.clearInterval(timer);
  }, [isPublicRoute, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col justify-between">
      <div>
        {!isPublicRoute && <Navbar />}
        <main className={isPublicRoute ? "" : "max-w-7xl mx-auto px-4 py-6"}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<FarmerRegistration />} />
            <Route path="/home" element={<FarmerDashboard />} />
            <Route path="/farmer" element={<FarmerDashboard />} />
            <Route path="/buyer" element={<BuyerDashboard />} />
            <Route path="/fpo" element={<FPODashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/prices" element={<PriceTrends />} />
            <Route path="/prices/:crop" element={<PriceTrends />} />
            <Route path="/logistics" element={<LogisticsStorage />} />
            <Route path="/grievances" element={<GrievancePortal />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>

      {/* Clean Footer */}
      {!isPublicRoute && <footer className="bg-emerald-950 text-emerald-300/80 border-t border-emerald-900 py-6 text-center text-xs mt-12 space-y-1">
        <div className="font-bold text-white tracking-wide">🌾 KisanSetu</div>
        <div>Strengthening Market Linkages and Transparent Price Discovery for Indian Farmers</div>
        <div className="text-[10px] text-emerald-400/60">
          Powered by Machine Learning (Prophet, XGBoost, SHAP, YOLOv8) • Multilingual Voice Advisory • 100% Escrow Protection
        </div>
      </footer>}

      {/* Persistent Floating AI Assistant Button */}
      {!isPublicRoute && <FloatingAssistantButton />}

      {/* Modal */}
      <AgentAssistantModal isOpen={isOpen} onClose={closeAssistant} />
    </div>
  );
}
