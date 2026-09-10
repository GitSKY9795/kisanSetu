import { useLocation, Navigate, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import ProtectedRoute, { ROLE_HOME } from "./components/ProtectedRoute.jsx";
import FarmerOverview from "./pages/FarmerOverview.jsx";
import FarmerDashboard from "./pages/FarmerDashboard.jsx";
import BuyerDashboard from "./pages/BuyerDashboard.jsx";
import FPODashboard from "./pages/FPODashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Marketplace from "./pages/Marketplace.jsx";
import PriceTrends from "./pages/PriceTrends.jsx";
import LogisticsStorage from "./pages/LogisticsStorage.jsx";
import GrievancePortal from "./pages/GrievancePortal.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AgentAssistantModal from "./components/AgentAssistantModal.jsx";
import FloatingAssistantButton from "./components/FloatingAssistantButton.jsx";
import { useAssistant } from "./context/AssistantContext.jsx";
import { useAuth } from "./context/AuthContext.jsx";

function RoleHomeRedirect() {
  const { role } = useAuth();
  return <Navigate to={(role && ROLE_HOME[role]) || "/login"} replace />;
}

const ANY_ROLE = ["FARMER", "BUYER", "FPO", "ADMIN"];

export default function App() {
  const { isOpen, closeAssistant } = useAssistant();
  const { pathname } = useLocation();
  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/register";

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 font-sans flex flex-col justify-between">
      <div>
        {!isPublicRoute && <Navbar />}
        <main className={isPublicRoute ? "" : "max-w-7xl mx-auto px-4 py-6"}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/home" element={<ProtectedRoute role={ANY_ROLE}><RoleHomeRedirect /></ProtectedRoute>} />

            <Route path="/farmer" element={<ProtectedRoute role="FARMER"><FarmerDashboard /></ProtectedRoute>} />
            <Route path="/farmer/profile" element={<ProtectedRoute role="FARMER"><FarmerOverview /></ProtectedRoute>} />
            <Route path="/buyer" element={<ProtectedRoute role="BUYER"><BuyerDashboard /></ProtectedRoute>} />
            <Route path="/fpo" element={<ProtectedRoute role="FPO"><FPODashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute role="ADMIN"><AdminDashboard /></ProtectedRoute>} />

            <Route path="/marketplace" element={<ProtectedRoute role={ANY_ROLE}><Marketplace /></ProtectedRoute>} />
            <Route path="/prices" element={<ProtectedRoute role={ANY_ROLE}><PriceTrends /></ProtectedRoute>} />
            <Route path="/prices/:crop" element={<ProtectedRoute role={ANY_ROLE}><PriceTrends /></ProtectedRoute>} />
            <Route path="/logistics" element={<ProtectedRoute role={ANY_ROLE}><LogisticsStorage /></ProtectedRoute>} />
            <Route path="/grievances" element={<ProtectedRoute role={ANY_ROLE}><GrievancePortal /></ProtectedRoute>} />
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
